import { ScheduledEvent } from 'aws-lambda';

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Hello World: ', event);
}
