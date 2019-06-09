import { Room } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

const { random, round, floor } = Math;

export class Item extends Schema {
  @type("int8")
  int8 = 42;

  @type("string")
  string = "something";
}

export class Player extends Schema {
  @type("number")
  x = floor(random() * 400);

  @type("number")
  y = floor(random() * 400);

  @type([Item])
  items = new ArraySchema<Item>();

  getRandomItem() {
    const idx = floor(random() * (this.items.length - 1));
    return {
      item: this.items[idx],
      itemIdx: idx
    };
  }
}

export class State extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  something = "This attribute won't be sent to the client-side";

  createPlayer(id: string) {
    this.players[id] = new Player();
  }

  removePlayer(id: string) {
    delete this.players[id];
  }

  movePlayer(id: string, movement: any) {
    if (movement.x) {
      this.players[id].x += movement.x * 10;
    } else if (movement.y) {
      this.players[id].y += movement.y * 10;
    }
  }

  addItem(id: string) {
    const item = new Item();
    item.int8 = round(random() * 250);
    item.string = random()
      .toString(36)
      .substring(8)
      .toUpperCase();

    this.players[id].items.push(item);
  }

  moveItem(id: string) {
    const playerIds = Object.keys(this.players).filter(k => k !== id);
    if (playerIds.length === 0) {
      return;
    }
    const max = playerIds.length - 1;
    const picked = floor(random() * max);
    const targetPlayer = this.players[playerIds[picked]];
    const { item, itemIdx } = this.players[id].getRandomItem();

    // Remove that item from myself
    this.players[id].items.splice(itemIdx, 1);

    // Add it to the other player
    targetPlayer.items.push(item);
  }
}

export class StateHandlerRoom extends Room<State> {
  onInit(options) {
    console.log("StateHandlerRoom created!", options);

    this.setState(new State());
  }

  onJoin(client) {
    this.state.createPlayer(client.sessionId);
  }

  onLeave(client) {
    this.state.removePlayer(client.sessionId);
  }

  onMessage(client, data) {
    console.log(
      "StateHandlerRoom received message from",
      client.sessionId,
      ":",
      data
    );
    if (data.cmd === "addItem") {
      this.state.addItem(client.sessionId);
    }
    if (data.cmd === "moveItem") {
      this.state.moveItem(client.sessionId);
    }
    if ("x" in data || "y" in data) {
      this.state.movePlayer(client.sessionId, data);
    }
  }

  onDispose() {
    console.log("Dispose StateHandlerRoom");
  }
}
