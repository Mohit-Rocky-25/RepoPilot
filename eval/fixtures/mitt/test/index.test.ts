import { describe, it, expect } from "vitest";
import mitt, { Emitter, Handler } from "../src/index";

describe("mitt", () => {
  it("should default to an empty map", () => {
    const inst = mitt();
    expect(inst.all).toBeInstanceOf(Map);
    expect(inst.all.size).toBe(0);
  });

  it("should register handlers with on", () => {
    const inst = mitt();
    const foo = () => {};
    inst.on("foo", foo);
    expect(inst.all.get("foo")).toEqual([foo]);
  });

  it("should unregister handlers with off", () => {
    const inst = mitt();
    const foo = () => {};
    inst.on("foo", foo);
    inst.off("foo", foo);
    expect(inst.all.get("foo")).toEqual([]);
  });

  it("should emit events with emit", () => {
    const inst = mitt<{ foo: string }>();
    let called = "";
    inst.on("foo", (val) => { called = val; });
    inst.emit("foo", "bar");
    expect(called).toBe("bar");
  });

  it("should support wildcard handlers", () => {
    const inst = mitt<{ foo: string }>();
    let eventName = "";
    inst.on("*", (name) => { eventName = name as string; });
    inst.emit("foo", "bar");
    expect(eventName).toBe("foo");
  });
});
