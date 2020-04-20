import { handler, constructGetMetricsQuery } from '../src/s3Export';
import { ScheduledEvent } from 'aws-lambda';
import { mock, restore } from 'aws-sdk-mock'
import { CloudWatch } from 'aws-sdk';

describe('dynamoStream', () => {
  const mockMetricData = { foo: "bar" }
  let cloudwatchGetMetricDataMock = jest.fn().mockResolvedValue(mockMetricData)
  let s3PutObjectMock = jest.fn().mockResolvedValue({});
  let ssmGetParameterMock = jest.fn().mockResolvedValue({});
  let ssmPutParamterMock = jest.fn().mockResolvedValue({});

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
    process.env.SSMPARAMETERNAME = '/metrics/previous-export-end-date';
    process.env.EXPORTBUCKETNAME = 'z-bucket-test-export';
    process.env.METRICSFILTER =
      '[{ "metricName" : "ConcurrentExecutions", "nameSpace" : "AWS/Lambda"}, { "metricName" : "IncomingBytes", "nameSpace" : "AWS/Logs"}]';
  });

  beforeEach(() => {
    mock('CloudWatch', 'getMetricData', cloudwatchGetMetricDataMock);

    mock('S3', 'putObject', s3PutObjectMock);
    mock('SSM', 'getParameter', ssmGetParameterMock);
    mock('SSM', 'putParameter', ssmPutParamterMock);



  })

  afterEach(() => {
    restore()
  });

  it('should query for metrics from CloudWatch', async () => {
    await handler(cloudwatchMockEvent);
    expect(cloudwatchGetMetricDataMock).toHaveBeenCalled()
  });
  
  it('should store the results of the CloudWatch Query in S3', async () => {
    
    await handler(cloudwatchMockEvent);
    const callback = expect.anything()
    expect(s3PutObjectMock).toHaveBeenCalledWith(expect.objectContaining({
      Body: JSON.stringify(mockMetricData)
    }), callback)
  })
  
  it('should grant full control to the bucket owner', async () => {
    await handler(cloudwatchMockEvent);
    const callback = expect.anything()

    expect(s3PutObjectMock).toHaveBeenCalledWith(expect.objectContaining({
      ACL: 'bucket-owner-full-control'
    }), callback)

  })

  describe('#constructGetMetricsQuery()', () => {
    const item = { "metricName": "ConcurrentExecutions", "nameSpace": "AWS/Lambda" }
    const item2 = { "metricName": "IncomingBytes", "nameSpace": "AWS/Logs" }
    const itemWithDimension = { "metricName": "NetworkOut", "nameSpace": "AWS/EC2", "dimensions": [{ "name": "AutoScalingGroupName", value: "my-asg-A" }] }
    const itemWithMultipleDimension = {
      "metricName": "CallCount", "nameSpace": "AWS/Usage", "dimensions": [
        { "name": "Type", "value": "API" },
        { "name": "Resource", "value": "GetMetricData" },
        { "name": "Service", "value": "CloudWatch" },
        { "name": "Class", "value": "None" }
      ]
    }

    it('should construct a MetricDataQueries object', () => {
      const metricFilters = [item]
      const period = 10;
      const expected = [{ "Id": "m0", "MetricStat": { "Metric": { "MetricName": "ConcurrentExecutions", "Namespace": "AWS/Lambda" }, "Period": 10, "Stat": "Average" } }]
      const actual = constructGetMetricsQuery(period, metricFilters)
      expect(actual).toEqual(expected)

    })

    const itemWithDimensionMetric = { "MetricName": "NetworkOut", "Namespace": "AWS/EC2", Dimensions: [{ Name: "AutoScalingGroupName", Value: "my-asg-A" }] }
    const itemWithMultipleDimensionMetric = {
      "MetricName": "CallCount", "Namespace": "AWS/Usage",
      Dimensions: [
        { "Name": "Type", "Value": "API" },
        { "Name": "Resource", "Value": "GetMetricData" },
        { "Name": "Service", "Value": "CloudWatch" },
        { "Name": "Class", "Value": "None" }
      ]
    }
    it.each`
      filter                | expected
      ${[itemWithDimension]}  | ${[{ "Id": "m0", "MetricStat": { "Metric": itemWithDimensionMetric, "Period": 10, "Stat": "Average" } }]}
      ${[itemWithMultipleDimension]}  | ${[{ "Id": "m0", "MetricStat": { "Metric": itemWithMultipleDimensionMetric, "Period": 10, "Stat": "Average" } }]}
    `('should construct a MetricDataQueries object with Dimension', ({ filter, expected }) => {
      const period = 10;
      const actual = constructGetMetricsQuery(period, filter)
      expect(actual).toEqual(expected)

    })

    it.each`
      filter                  | expectedLength
      ${[item]}               | ${1}
      ${[item, item]}         | ${2}
      ${[item, item, item]}   | ${3}
    `('should create a query for each metric filter defined', ({ filter, expectedLength }) => {

      const period = 10;
      const actual = constructGetMetricsQuery(period, filter)
      expect(actual.length).toEqual(expectedLength)
    })

    it('should omit Dimension if not specified in the input', () => {
      const metricFilters = [{ "metricName": "ConcurrentExecutions", "nameSpace": "AWS/Lambda" }, { "metricName": "IncomingBytes", "nameSpace": "AWS/Logs" }]
      const period = 10;
      const actual = constructGetMetricsQuery(period, metricFilters)

      actual.map(filter => {
        expect(filter.MetricStat?.Metric.Dimensions).not.toBeDefined()
      })

    })

    it('should generate a unique id for each query', () => {
      const metricFilters = [item, item2, itemWithDimension]
      const actual = constructGetMetricsQuery(0, metricFilters)

      const ids = actual.map(x => x.Id)

      expect(new Set(ids).size).toEqual(3)

    })
  })
});
