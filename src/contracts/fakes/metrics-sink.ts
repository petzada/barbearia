import type { MetricEvent, MetricsSink } from '../ports/metrics-sink'

export class FakeMetricsSink implements MetricsSink {
  readonly events: MetricEvent[] = []

  record(event: MetricEvent): void {
    this.events.push(event)
  }
}
