import { Room, Client } from "colyseus";
import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("number")
    x = Math.floor(Math.random() * 400);

    @type("number")
    y = Math.floor(Math.random() * 400);
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();
    @type(["number"])
    arrayTest = new ArraySchema<number>();

    something = "This attribute won't be sent to the client-side";

    createPlayer(sessionId: string) {
        this.players.set(sessionId, new Player());
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer(sessionId: string, movement: any) {
        if (movement.x) {
            this.players.get(sessionId).x += movement.x * 10;
        } else if (movement.y) {
            this.players.get(sessionId).y += movement.y * 10;
        }
    }

    addNumber(value: number) {
        this.arrayTest.push(value);
    }

    removeNumber(index: number) {
        this.arrayTest.splice(index, 1);
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 4;

    onCreate(options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            console.log(
                "StateHandlerRoom received message from",
                client.sessionId,
                ":",
                data
            );
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("addNumber", (client, data) => {
            console.log("Adding number:", data);
            this.state.addNumber(data);
        });

        this.onMessage("removeNumber", (client, data) => {
            console.log("Removing number from index:", data);
            this.state.removeNumber(data);
        });
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin(client: Client) {
        client.send("hello", "world");
        this.state.createPlayer(client.sessionId);
    }

    onLeave(client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }
}
