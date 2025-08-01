import { KurrentDBClient, StreamSubscription } from "@kurrent/kurrentdb-client";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { KurrentDbContainer } from "./kurrentdb-container";

const IMAGE = getImage(__dirname);

describe.sequential("KurrentDbContainer", { timeout: 240_000 }, () => {
  it("should execute write and read", async () => {
    // startContainer {
    await using container = await new KurrentDbContainer(IMAGE).start();

    const client = KurrentDBClient.connectionString(container.getConnectionString());

    await client.appendToStream("User-1", [
      {
        contentType: "application/json",
        data: { email: "john@foo.local" },
        type: "UserCreated",
        id: "28ab6bca-d9ae-418b-a1af-eb65dd653c38",
        metadata: { someMetadata: "bar" },
      },
    ]);

    expect(await consumeSteamingRead(client.readStream("User-1"))).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({
          data: { email: "john@foo.local" },
          id: "28ab6bca-d9ae-418b-a1af-eb65dd653c38",
          isJson: true,
          metadata: { someMetadata: "bar" },
          revision: 0,
          streamId: "User-1",
          type: "UserCreated",
        }),
      }),
    ]);

    await client.dispose();

    async function consumeSteamingRead(read: AsyncIterableIterator<unknown>): Promise<unknown[]> {
      const events = [];
      for await (const event of read) {
        events.push(event);
      }
      return events;
    }
    // }
  });

  it("should use built-in projections", async () => {
    // usingStandardProjections {
    await using container = await new KurrentDbContainer(IMAGE).start();
    const client = KurrentDBClient.connectionString(container.getConnectionString());

    await client.appendToStream("Todo-1", [
      {
        contentType: "application/json",
        data: { title: "Do something" },
        metadata: {},
        id: "7eccc3a7-0664-4348-a621-029125741e22",
        type: "TodoCreated",
      },
    ]);
    const stream = client.subscribeToStream("$ce-Todo", { resolveLinkTos: true });

    expect(await getStreamFirstEvent(stream)).toEqual(
      expect.objectContaining({
        event: expect.objectContaining({
          data: { title: "Do something" },
          id: "7eccc3a7-0664-4348-a621-029125741e22",
          isJson: true,
          metadata: {},
          revision: 0n,
          streamId: "Todo-1",
          type: "TodoCreated",
        }),
        link: expect.objectContaining({
          isJson: false,
          metadata: expect.objectContaining({
            $causedBy: "7eccc3a7-0664-4348-a621-029125741e22",
            $o: "Todo-1",
          }),
          revision: 0n,
          streamId: "$ce-Todo",
          type: "$>",
        }),
      })
    );
    await stream.unsubscribe();
    await client.dispose();

    async function getStreamFirstEvent(stream: StreamSubscription): Promise<unknown> {
      for await (const event of stream) {
        return event;
      }
    }
    // }
  });
});
