import { AvalonError, isAvalonError } from "../src"

describe("AvalonError", () => {
    it("carries a code, a message and optional details", () => {
        const error = new AvalonError("INVALID_STAGE", "msg", { foo: 1 })
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(AvalonError)
        expect(error.name).toBe("AvalonError")
        expect(error.code).toBe("INVALID_STAGE")
        expect(error.message).toBe("msg")
        expect(error.details).toEqual({ foo: 1 })
    })

    it("isAvalonError recognises errors from another copy of the package", () => {
        const foreign = Object.assign(new Error("msg"), { name: "AvalonError", code: "INVALID_STAGE" })
        expect(isAvalonError(new AvalonError("INVALID_PLAYER", "msg"))).toBe(true)
        expect(isAvalonError(foreign)).toBe(true)
        expect(isAvalonError(new Error("msg"))).toBe(false)
        expect(isAvalonError({ name: "AvalonError", code: "INVALID_STAGE" })).toBe(false)
        expect(isAvalonError(undefined)).toBe(false)
    })
})
