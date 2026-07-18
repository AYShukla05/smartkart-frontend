import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "../api";

export interface SellerAssistantResponse {
  response: string;
}

@Injectable({ providedIn: "root" })
export class SellerAssistantService {
  private readonly api = inject(ApiService);

  ask(question: string): Observable<SellerAssistantResponse> {
    return this.api.post<SellerAssistantResponse>("/ai/seller-assistant/", { question });
  }
}
