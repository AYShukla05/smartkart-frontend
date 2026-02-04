import { Component, ChangeDetectionStrategy } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NavbarComponent } from "../../shared/components/navbar/navbar.component";
import { ToastComponent } from "../../shared/components/toast/toast.component";

@Component({
  selector: "app-main-layout",
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  templateUrl: "./main-layout.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {}
