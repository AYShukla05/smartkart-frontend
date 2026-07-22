import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api";

export interface OrderAssistantResponse {
  response: string;
  conversation_id: number;
}

@Injectable({ providedIn: "root" })
export class BuyerAssistantService {
  private readonly api = inject(ApiService);

  ask(message: string, conversationId: number | null): Observable<OrderAssistantResponse> {
    const body: { message: string; conversation_id?: number } = { message };
    if (conversationId !== null) {
      body.conversation_id = conversationId;
    }
    return this.api.post<OrderAssistantResponse>("/ai/order-assistant/", body);
  }
}
