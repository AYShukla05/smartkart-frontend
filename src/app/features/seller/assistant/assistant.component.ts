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

    this.assistantService.ask(question).subscribe({
      next: ({ response, pending_actions }) => {
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
        this.updateActionEntry(message, entry, { status: "confirmed" });
        const text =
          entry.action.action === "create_product"
            ? `Done — **${result.product_name}** has been added to your store.`
            : `Done — ${result.product_name}'s ${result.field} is now ${result.new_value}.`;
        this.messages.update((msgs) => [
          ...msgs,
          { id: nextMessageId++, role: "answer", text },
        ]);
        this.scrollToBottom();
      },
      error: (err) => {
        const errorMessage = normalizeApiError(err).message;
        this.updateActionEntry(message, entry, { status: "error", error: errorMessage });
      },
    });
  }

  cancelPendingAction(message: AssistantMessage, entry: PendingActionEntry): void {
    this.updateActionEntry(message, entry, { status: "cancelled" });
  }

  newChat(): void {
    this.messages.set([]);
    this.question.set("");
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
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
