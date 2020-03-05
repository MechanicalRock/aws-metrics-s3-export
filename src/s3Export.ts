import { ScheduledEvent } from 'aws-lambda';
// import { CloudWatch } from 'aws-sdk';

export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Event is: ', event);
  // const cw = new CloudWatch();
  // const x: CloudWatch.GetMetricStatisticsInput = {
  //   MetricName: 'pipeline',
  //   Namespace: '',
  //   Period: 30,
  //   StartTime: new Date(),
  //   EndTime: new Date(),
  // };
  // const result = await cw.getMetricStatistics(x).promise;
  // console.log('Hello World: ', result);
}
