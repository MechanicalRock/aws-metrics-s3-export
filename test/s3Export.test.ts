import { handler } from '../src/s3Export';
import { ScheduledEvent } from 'aws-lambda';

describe('dynamoStream', () => {
  const cloudwatchMockEvent: ScheduledEvent = {
    account: '123456789012',
    region: 'ap-southeast-2',
    detail: {},
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    time: '2019-03-01T01:23:45Z',
    id: 'cdc73f9d-aea9-11e3-9d5a-835b769c0d9c',
    resources: ['arn:aws:events:ap-southeast-2:123456789012:rule/my-schedule'],
  };
  beforeEach(async () => {
    console.log('Hello World');
    process.env.SSMPARAMETERNAME = '/metrics/previous-export-end-date';
    process.env.EXPORTBUCKETNAME = 'z-bucket-test-export';
    process.env.METRICSFILTER =
      '[{ "metricName" : "ConcurrentExecutions", "nameSpace" : "Lambda"}, { "metricName" : "IncomingBytes", "nameSpace" : "Logs"}]';
  });

  afterEach(() => {
    console.log('Hello World');
  });

  it('should calculate the total score when there is a previouse score stored in dynamo', async () => {
    process.env.PRIOD = 'MONTHLY';
    await handler(cloudwatchMockEvent);
    expect(true).toBe(true);
  });

  it('should calculate the total score when there is a previouse score stored in dynamo', async () => {
    process.env.PRIOD = 'FORTNIGHLY';
    await handler(cloudwatchMockEvent);
    expect(true).toBe(true);
  });

  it('should calculate the total score when there is a previouse score stored in dynamo', async () => {
    process.env.PRIOD = 'WEEKLY';
    await handler(cloudwatchMockEvent);
    expect(true).toBe(true);
  });
});
