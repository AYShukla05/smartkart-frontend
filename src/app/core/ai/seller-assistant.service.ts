import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api";

export interface PendingAction {
  action: string;
  product_id: number;
  product_name: string;
  field: string;
  current_value: string | number;
  new_value: string | number;
}

export interface SellerAssistantResponse {
  response: string;
  pending_action: PendingAction | null;
}

export interface ConfirmActionResponse {
  success: boolean;
  product_id: number;
  product_name: string;
  field: string;
  new_value: string | number;
}

@Injectable({ providedIn: "root" })
export class SellerAssistantService {
  private readonly api = inject(ApiService);

  ask(question: string): Observable<SellerAssistantResponse> {
    return this.api.post<SellerAssistantResponse>("/ai/seller-assistant/", { question });
  }

  confirmAction(pendingAction: PendingAction): Observable<ConfirmActionResponse> {
    return this.api.post<ConfirmActionResponse>("/ai/seller-assistant/confirm-action/", {
      action: pendingAction.action,
      product_id: pendingAction.product_id,
      new_value: pendingAction.new_value,
    });
  }
}
