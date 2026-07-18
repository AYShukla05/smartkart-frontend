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
import { SellerAssistantService, normalizeApiError } from "../../../core";

export type AssistantMessageRole = "question" | "answer" | "error";

export interface AssistantMessage {
  role: AssistantMessageRole;
  text: string;
}

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

  ask(): void {
    const question = this.question().trim();
    if (!question || this.isLoading()) return;

    this.messages.update((msgs) => [...msgs, { role: "question", text: question }]);
    this.question.set("");
    this.isLoading.set(true);
    this.scrollToBottom();

    this.assistantService.ask(question).subscribe({
      next: ({ response }) => {
        this.messages.update((msgs) => [...msgs, { role: "answer", text: response }]);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const message = normalizeApiError(err).message;
        this.messages.update((msgs) => [...msgs, { role: "error", text: message }]);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
    });
  }

  newChat(): void {
    this.messages.set([]);
    this.question.set("");
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
