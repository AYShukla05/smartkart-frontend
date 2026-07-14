import { Component, ChangeDetectionStrategy, input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-loader",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./app-loader.component.html",
  styleUrl: "./app-loader.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLoaderComponent {
  readonly fullScreen = input(false);
  readonly message = input("Loading…");
}
