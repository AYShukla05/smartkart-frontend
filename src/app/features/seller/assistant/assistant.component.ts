import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ActionOutcome,
  ConfirmActionResponse,
  PendingAction,
  SellerAssistantService,
  normalizeApiError,
  renderAssistantMarkdown,
} from "../../../core";

export type AssistantMessageRole = "question" | "answer" | "error";
export type PendingActionStatus = "pending" | "confirming" | "confirmed" | "cancelled" | "error";

export interface PendingActionEntry {
  id: number;
  action: PendingAction;
  status: PendingActionStatus;
  error?: string;
  // Populated on a successful confirm - the actual applied value, since it's
  // what get reported back to the conversation history once the whole batch
  // resolves (see maybeRecordOutcomes).
  result?: ConfirmActionResponse;
}

export interface AssistantMessage {
  id: number;
  role: AssistantMessageRole;
  text: string;
  pendingActions?: PendingActionEntry[];
}

let nextMessageId = 0;
let nextActionEntryId = 0;

const EXAMPLE_QUESTIONS = [
  "Which of my products are running low on stock?",
  "What were my total sales this month?",
  "Which category sells best for me?",
  "Find products similar to wireless earbuds",
];

@Component({
  selector: "app-seller-assistant",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./assistant.component.html",
  styleUrl: "./assistant.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerAssistantComponent {
  private readonly assistantService = inject(SellerAssistantService);

  @ViewChild("scrollContainer") private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly exampleQuestions = EXAMPLE_QUESTIONS;
  readonly question = signal("");
  readonly messages = signal<AssistantMessage[]>([]);
  readonly isLoading = signal(false);

  // Plain component state, not a signal - starts null every page load by
  // design (see BuyerAssistantComponent: a fresh conversation per session).
  private conversationId: number | null = null;

  // Tracks which assistant messages' proposal batches have already been
  // reported to the conversation history, so a batch is recorded exactly
  // once even though maybeRecordOutcomes is checked after every individual
  // confirm/cancel in that batch.
  private recordedMessageIds = new Set<number>();

  onQuestionInput(event: Event): void {
    this.question.set((event.target as HTMLTextAreaElement).value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.ask();
    }
  }

  useExample(example: string): void {
    this.question.set(example);
  }

  renderMarkdown(text: string): string {
    return renderAssistantMarkdown(text);
  }

  ask(): void {
    const question = this.question().trim();
    if (!question || this.isLoading()) return;

    this.messages.update((msgs) => [...msgs, { id: nextMessageId++, role: "question", text: question }]);
    this.question.set("");
    this.isLoading.set(true);
    this.scrollToBottom();

    this.assistantService.ask(question, this.conversationId).subscribe({
      next: ({ response, pending_actions, conversation_id }) => {
        this.conversationId = conversation_id;
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: nextMessageId++,
            role: "answer",
            text: response,
            pendingActions: pending_actions.map((action) => ({
              id: nextActionEntryId++,
              action,
              status: "pending" as PendingActionStatus,
            })),
          },
        ]);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const message = normalizeApiError(err).message;
        this.messages.update((msgs) => [...msgs, { id: nextMessageId++, role: "error", text: message }]);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
    });
  }

  confirmPendingAction(message: AssistantMessage, entry: PendingActionEntry): void {
    if (entry.status === "confirming") return;
    this.updateActionEntry(message, entry, { status: "confirming" });

    this.assistantService.confirmAction(entry.action).subscribe({
      next: (result) => {
        this.updateActionEntry(message, entry, { status: "confirmed", result });
        const text =
          entry.action.action === "create_product"
            ? `Done — **${result.product_name}** has been added to your store.`
            : `Done — ${result.product_name}'s ${result.field} is now ${result.new_value}.`;
        this.messages.update((msgs) => [
          ...msgs,
          { id: nextMessageId++, role: "answer", text },
        ]);
        this.scrollToBottom();
        this.maybeRecordOutcomes(message);
      },
      error: (err) => {
        const errorMessage = normalizeApiError(err).message;
        this.updateActionEntry(message, entry, { status: "error", error: errorMessage });
      },
    });
  }

  cancelPendingAction(message: AssistantMessage, entry: PendingActionEntry): void {
    this.updateActionEntry(message, entry, { status: "cancelled" });
    this.maybeRecordOutcomes(message);
  }

  newChat(): void {
    this.messages.set([]);
    this.question.set("");
    this.conversationId = null;
    this.recordedMessageIds.clear();
  }

  // Reports one turn's whole batch of proposals back to the conversation
  // history in a single call, once every card from that turn has been
  // confirmed or cancelled - not on each individual click. This is what
  // stops the assistant giving stale answers later (e.g. "the price hasn't
  // been updated yet" when it actually has): before this, confirming a
  // proposal never told the model's own context what actually happened.
  //
  // If a card is left in "pending" or "error" indefinitely, this batch is
  // never recorded - an accepted tradeoff for keeping this a single call
  // per batch rather than a partial write per action.
  private maybeRecordOutcomes(message: AssistantMessage): void {
    // Read the current signal state by id, not the `message` parameter -
    // that's a snapshot from whenever the caller's async callback started,
    // and won't yet reflect the very updateActionEntry() call that just
    // ran immediately before this (the entry being resolved right now would
    // always look "still pending" otherwise, so this would never fire).
    const current = this.messages().find((m) => m.id === message.id);
    const entries = current?.pendingActions;
    if (!entries || entries.length === 0) return;
    if (this.recordedMessageIds.has(message.id)) return;

    const allResolved = entries.every((e) => e.status === "confirmed" || e.status === "cancelled");
    if (!allResolved) return;
    if (this.conversationId === null) return;

    this.recordedMessageIds.add(message.id);

    const outcomes: ActionOutcome[] = entries.map((entry) =>
      entry.status === "confirmed" && entry.result
        ? {
            product_name: entry.result.product_name,
            field: entry.result.field,
            status: "confirmed",
            new_value: entry.result.new_value,
          }
        : {
            product_name: entry.action.product_name,
            field: entry.action.field ?? "listing",
            status: "cancelled",
          },
    );

    // Best-effort: if this fails, the fallback system-prompt instruction
    // (always verify current state with a lookup tool) still catches it.
    this.assistantService.recordActionOutcomes(this.conversationId, outcomes).subscribe({ error: () => {} });
  }

  private updateActionEntry(
    message: AssistantMessage,
    entry: PendingActionEntry,
    changes: Partial<PendingActionEntry>,
  ): void {
    this.messages.update((msgs) =>
      msgs.map((m) => {
        if (m.id !== message.id || !m.pendingActions) return m;
        return {
          ...m,
          pendingActions: m.pendingActions.map((e) => (e.id === entry.id ? { ...e, ...changes } : e)),
        };
      }),
    );
  }

  private scrollToBottom(): void {
    // setTimeout(0) fires after the JS stack clears but not necessarily after
    // the browser has laid out newly-added DOM (e.g. two pending-action cards
    // from one reply) - scrollHeight can be read mid-layout and undershoot.
    // Double rAF waits for a full paint cycle first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = this.scrollContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }
}
