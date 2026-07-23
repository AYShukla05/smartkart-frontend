import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api";

export interface PendingAction {
  action: string;
  product_id: number | null;
  product_name: string;
  field?: string;
  current_value?: string | number;
  new_value?: string | number;
  // create_product proposals describe themselves with a summary line instead
  // of a single field/current/new diff, since several fields are set at once.
  summary?: string;
  category_id?: number;
  price?: string;
  stock?: number;
}

export interface SellerAssistantResponse {
  response: string;
  pending_actions: PendingAction[];
  conversation_id: number;
}

export interface ConfirmActionResponse {
  success: boolean;
  product_id: number;
  product_name: string;
  field: string;
  new_value: string | number;
}

export interface ActionOutcome {
  product_name: string;
  field: string;
  status: "confirmed" | "cancelled";
  new_value?: string | number;
}

@Injectable({ providedIn: "root" })
export class SellerAssistantService {
  private readonly api = inject(ApiService);

  ask(question: string, conversationId: number | null): Observable<SellerAssistantResponse> {
    const body: { question: string; conversation_id?: number } = { question };
    if (conversationId !== null) {
      body.conversation_id = conversationId;
    }
    return this.api.post<SellerAssistantResponse>("/ai/seller-assistant/", body);
  }

  confirmAction(pendingAction: PendingAction): Observable<ConfirmActionResponse> {
    const body =
      pendingAction.action === "create_product"
        ? {
            action: pendingAction.action,
            name: pendingAction.product_name,
            category_id: pendingAction.category_id,
            price: pendingAction.price,
            stock: pendingAction.stock,
          }
        : {
            action: pendingAction.action,
            product_id: pendingAction.product_id,
            new_value: pendingAction.new_value,
          };
    return this.api.post<ConfirmActionResponse>("/ai/seller-assistant/confirm-action/", body);
  }

  // Called once per batch of proposals - after every card from one turn has
  // been confirmed or cancelled, not on each individual click - so the
  // conversation history gets one consolidated update instead of one per
  // action. Purely informational: no mutation happens here.
  recordActionOutcomes(conversationId: number, outcomes: ActionOutcome[]): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>("/ai/seller-assistant/record-outcomes/", {
      conversation_id: conversationId,
      outcomes,
    });
  }
}
