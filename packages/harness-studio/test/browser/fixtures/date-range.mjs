import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHarnessStudioServer } from '../../../dist/server/server.js';

/**
 * A Project whose Sessions sit on today, yesterday and two days ago, plus one
 * archived Session outside the default window. Discovery honours the window it
 * is given and records every call, so the browser test can tell a narrowing
 * (answered from loaded rows) apart from a re-scan.
 */
export async function startDateRangeFixture() {
  const workspace = await mkdtemp(join(tmpdir(), 'studio-date-range-'));
  await mkdir(join(workspace, 'outputs'));
  const now = new Date();
  const localDay = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12, 0, 0);
  const records = [
    { id: 'codex:today', savedAt: localDay(0).toISOString(), prompt: 'Today workflow', resource: 'outputs/today.md' },
    { id: 'codex:yesterday', savedAt: localDay(-1).toISOString(), prompt: 'Yesterday workflow', resource: 'outputs/yesterday.md' },
    { id: 'codex:two-days', savedAt: localDay(-2).toISOString(), prompt: 'Two days ago workflow', resource: 'outputs/two-days.md' },
    { id: 'codex:old', savedAt: '2000-01-01T12:00:00.000Z', prompt: 'Archived workflow', resource: 'outputs/archived.md' },
  ];
  for (const record of records) await writeFile(join(workspace, record.resource), `# ${record.prompt}\n\nRetained project output.\n`);
  const inspectorReport = {
    kind: 'HarnessInspectorReportV1', workspace: { name: 'Date range fixture' },
    sessions: records.map(record => ({ sessionId: record.id, platform: 'Codex', firstSeen: record.savedAt,
      lastSeen: record.savedAt, prompts: [{ text: record.prompt, timestamp: record.savedAt }], toolCallCount: 1,
      toolActivity: { totalCalls: 1, calls: [] } })),
    days: records.map(record => ({ date: record.savedAt.slice(0, 10), sessionIds: [record.id], commitHashes: [] })),
    commits: [], stories: [], featureTree: { roots: [], nodes: [] },
  };
  const discoverCalls = [];
  const inWindow = (record, window) => {
    const at = Date.parse(record.savedAt);
    return window === undefined
      || ((window.fromMs === undefined || at >= window.fromMs) && (window.toMs === undefined || at <= window.toMs));
  };
  const studio = await startHarnessStudioServer({
    appDir: resolve(dirname(fileURLToPath(import.meta.url)), '../../../dist/app'), port: 0,
    workspaceDirectoryPicker: async () => workspace,
    workspaceSessionProvider: {
      discover: async (_selected, window) => {
        discoverCalls.push({ window });
        const included = records.filter(record => inWindow(record, window));
        return {
          label: 'Date range fixture', inspectorReport,
          providers: [{ provider: 'codex', status: 'ok', discovered: records.length, included: included.length }],
          sessions: included.map(record => ({
            summary: { ...record, status: 'observed', toolCallCount: 1, provider: 'Codex' },
            debugger: { id: record.id, name: record.prompt, agent: 'Codex', protocol: 'fixture', connection: 'observed', mode: 'Retained run',
              startedAt: '12:00:00', finishedAt: '12:00:01', events: [{ id: `${record.id}-write`, kind: 'change', phase: 'Change', title: 'Write output',
                summary: 'Retained output', timestamp: '12:00:00', relativeTime: 'retained', stopConditions: [], evidence: [],
                toolCalls: [{ id: `${record.id}-tool`, name: 'Write', summary: 'Write output', input: '', output: '', duration: '1 ms', resource: record.resource }],
                rawAcp: { direction: 'Agent → Client', method: 'session/tool-call', rpcId: record.id, sessionId: record.id, traceContext: 'fixture', payload: {} } }] } }
          )),
        };
      },
    },
  });
  return { ...studio, discoverCalls, async close() { await studio.close(); await rm(workspace, { recursive: true, force: true }); } };
}
