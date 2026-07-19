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

export interface AssistantMessage {
  id: number;
  role: AssistantMessageRole;
  text: string;
  pendingAction?: PendingAction;
  pendingActionStatus?: PendingActionStatus;
  pendingActionError?: string;
}

let nextMessageId = 0;

const EXAMPLE_QUESTIONS = [
  "Which of my products are running low on stock?",
  "What were my total sales this month?",
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
      next: ({ response, pending_action }) => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: nextMessageId++,
            role: "answer",
            text: response,
            pendingAction: pending_action ?? undefined,
            pendingActionStatus: pending_action ? "pending" : undefined,
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

  confirmPendingAction(message: AssistantMessage): void {
    if (!message.pendingAction || message.pendingActionStatus === "confirming") return;
    const pendingAction = message.pendingAction;
    this.updateMessage(message, { pendingActionStatus: "confirming" });

    this.assistantService.confirmAction(pendingAction).subscribe({
      next: (result) => {
        this.updateMessage(message, { pendingActionStatus: "confirmed" });
        this.messages.update((msgs) => [
          ...msgs,
          { id: nextMessageId++, role: "answer", text: `Done — ${result.product_name}'s ${result.field} is now ${result.new_value}.` },
        ]);
        this.scrollToBottom();
      },
      error: (err) => {
        const errorMessage = normalizeApiError(err).message;
        this.updateMessage(message, { pendingActionStatus: "error", pendingActionError: errorMessage });
      },
    });
  }

  cancelPendingAction(message: AssistantMessage): void {
    this.updateMessage(message, { pendingActionStatus: "cancelled" });
  }

  newChat(): void {
    this.messages.set([]);
    this.question.set("");
  }

  private updateMessage(target: AssistantMessage, changes: Partial<AssistantMessage>): void {
    this.messages.update((msgs) => msgs.map((m) => (m.id === target.id ? { ...m, ...changes } : m)));
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
