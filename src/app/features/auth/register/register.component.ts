import { Component, ChangeDetectionStrategy, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../../core";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./register.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);

  readonly registerForm = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    role: ["BUYER" as "BUYER" | "SELLER", [Validators.required]],
  });

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.getRawValue()).subscribe({
      next: (user) => {
        if (user.role === "SELLER") {
          this.router.navigate(["/seller"]);
        } else {
          this.router.navigate(["/"]);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 400) {
          // Handle validation errors from backend
          const errors = err.error;
          if (errors?.email) {
            this.errorMessage.set(errors.email[0]);
          } else if (errors?.password) {
            this.errorMessage.set(errors.password[0]);
          } else {
            this.errorMessage.set("Registration failed. Please try again.");
          }
        } else if (err.status === 0) {
          this.errorMessage.set("Unable to connect to server");
        } else {
          this.errorMessage.set("An error occurred. Please try again.");
        }
      },
    });
  }

  get email() {
    return this.registerForm.get("email");
  }

  get password() {
    return this.registerForm.get("password");
  }

  get role() {
    return this.registerForm.get("role");
  }
}
