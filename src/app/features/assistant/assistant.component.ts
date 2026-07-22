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
  BuyerAssistantService,
  normalizeApiError,
  renderAssistantMarkdown,
} from "../../core";

export type AssistantMessageRole = "question" | "answer" | "error";

export interface AssistantMessage {
  id: number;
  role: AssistantMessageRole;
  text: string;
}

let nextMessageId = 0;

const EXAMPLE_QUESTIONS = [
  "What did I order last month?",
  "Tell me more about my most recent order",
  "Find me something waterproof for hiking",
  "Do I have any cancelled orders?",
];

@Component({
  selector: "app-buyer-assistant",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./assistant.component.html",
  styleUrl: "./assistant.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuyerAssistantComponent {
  private readonly assistantService = inject(BuyerAssistantService);

  @ViewChild("scrollContainer") private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly exampleQuestions = EXAMPLE_QUESTIONS;
  readonly question = signal("");
  readonly messages = signal<AssistantMessage[]>([]);
  readonly isLoading = signal(false);

  // Deliberately plain component state, not a signal - starts null on every
  // page load by design (a fresh conversation per session is Phase 4 scope;
  // resuming a conversation across reloads is a future enhancement).
  private conversationId: number | null = null;

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
    const message = this.question().trim();
    if (!message || this.isLoading()) return;

    this.messages.update((msgs) => [...msgs, { id: nextMessageId++, role: "question", text: message }]);
    this.question.set("");
    this.isLoading.set(true);
    this.scrollToBottom();

    this.assistantService.ask(message, this.conversationId).subscribe({
      next: ({ response, conversation_id }) => {
        this.conversationId = conversation_id;
        this.messages.update((msgs) => [
          ...msgs,
          { id: nextMessageId++, role: "answer", text: response },
        ]);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const errorMessage = normalizeApiError(err).message;
        this.messages.update((msgs) => [...msgs, { id: nextMessageId++, role: "error", text: errorMessage }]);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
    });
  }

  newChat(): void {
    this.messages.set([]);
    this.question.set("");
    this.conversationId = null;
  }

  private scrollToBottom(): void {
    // setTimeout(0) fires after the JS stack clears but not necessarily after
    // the browser has laid out newly-added DOM - scrollHeight can be read
    // mid-layout and undershoot. Double rAF waits for a full paint cycle first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = this.scrollContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }
}
