import { Kafka, KafkaConfig, logLevel } from "kafkajs";
import { StartedKafkaContainer } from "./kafka-container";

// kafkaTestHelper {
export async function assertMessageProducedAndConsumed(
  container: StartedKafkaContainer,
  additionalConfig: Partial<KafkaConfig> = {}
) {
  const brokers = [`${container.getHost()}:${container.getMappedPort(9093)}`];
  const kafka = new Kafka({ logLevel: logLevel.NOTHING, brokers: brokers, ...additionalConfig });

  const producer = kafka.producer();
  await producer.connect();
  const consumer = kafka.consumer({ groupId: "test-group" });
  await consumer.connect();

  await producer.send({ topic: "test-topic", messages: [{ value: "test message" }] });
  await consumer.subscribe({ topic: "test-topic", fromBeginning: true });

  const consumedMessage = await new Promise((resolve) =>
    consumer.run({
      eachMessage: async ({ message }) => resolve(message.value?.toString()),
    })
  );
  expect(consumedMessage).toBe("test message");

  await consumer.disconnect();
  await producer.disconnect();
}
// }
