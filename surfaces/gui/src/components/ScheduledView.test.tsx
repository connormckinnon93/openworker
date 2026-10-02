import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ScheduledView } from "./ScheduledView";

vi.mock("../api", () => ({
  announceAutomationsChanged: vi.fn(),
  createAutomation: vi.fn(),
  deleteAutomation: vi.fn(),
  getAutomation: vi.fn(),
  getAutomations: vi.fn().mockResolvedValue([]),
  markAutomationSeen: vi.fn(),
  updateAutomation: vi.fn(),
}));

vi.mock("./AutomationQuickstart", () => ({
  AutomationQuickstart: () => <div data-testid="automation-quickstart" />,
}));

vi.mock("./IntegrationsView", () => ({
  PanelHead: ({ title, sub }: { title: string; sub: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{sub}</p>
    </header>
  ),
}));

afterEach(cleanup);

describe("ScheduledView empty state", () => {
  it("renders translated emphasis as a strong element, not literal markup", () => {
    const { container } = render(
      <ScheduledView onOpenRun={vi.fn()} onRunNow={vi.fn()} />,
    );

    expect(
      screen.getByText("+ New automation", { selector: "strong" }),
    ).toBeTruthy();
    expect(container.textContent).not.toContain("<strong>");
  });
});

describe("ScheduledView automation detail", () => {
  it("marks the automation seen only after loading it, so new runs keep their pill", async () => {
    const api = await import("../api");
    let resolveLoad!: (d: Awaited<ReturnType<typeof api.getAutomation>>) => void;
    vi.mocked(api.getAutomation).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    vi.mocked(api.markAutomationSeen).mockResolvedValue(undefined as never);

    render(
      <ScheduledView onOpenRun={vi.fn()} onRunNow={vi.fn()} initialOpenId="t1" />,
    );
    await waitFor(() => expect(api.getAutomation).toHaveBeenCalledWith("t1"));
    // A mark-seen sent before the load returns would advance the very mark the
    // "new" pills compare against.
    expect(api.markAutomationSeen).not.toHaveBeenCalled();

    resolveLoad({
      task: {
        id: "t1",
        title: "Daily AI News",
        instructions: "",
        schedule: "daily",
        workspace: "/w",
        agent: "coworker",
        enabled: true,
        next_run: null,
        last_run: 200,
        last_status: "completed",
        run_count: 1,
        notify_on_completion: false,
        seen_runs_at: 100,
        always_allowed: [],
      },
      runs: [
        {
          run_id: "r1",
          task_id: "t1",
          session_id: "__run__r1",
          started_at: 200,
          finished_at: 210,
          status: "completed",
          result_text: null,
          artifacts: [],
          error: null,
          trigger: "schedule",
        },
      ],
    });

    expect(await screen.findByTestId("run-new")).toBeTruthy();
    await waitFor(() => expect(api.markAutomationSeen).toHaveBeenCalledWith("t1"));
  });
});
