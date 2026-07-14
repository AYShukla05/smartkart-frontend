import { Component, OnInit, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HealthService } from "./core";
import { AppLoaderComponent } from "./shared";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, AppLoaderComponent],
  templateUrl: "./app.html",
})
export class App implements OnInit {
  private readonly health = inject(HealthService);
  readonly healthState = this.health.state;

  ngOnInit(): void {
    this.health.check();
  }
}
