declare module 'strtok2' {
  import EventEmitter = NodeJS.EventEmitter;

  type Value = any // ToDo? can this be more specific

  type Flush = (b: Buffer, o: number) => void

  type Get = (buf: Buffer, off: number) => Value

  type Put = (b: Buffer, o: number, v: number, flush: Flush) => number

  type Callback = (v: Value, cb) => void

  /**
   * Special Tokens (Sentinental types)
   */
  export interface ISentinelToken {
  }

  /**
   * The DEFER token indicates that the protocol doesn't know what type of token to read from the stream next.
   * Perhaps the protocol needs to consult some out-of-process datastructure, or wait for some other event to occur.
   * To support this case, the protocol callback is actually invoked with 2 arguments: the value and a defer callback.
   * It is this second parameter, a callback, that must be invoked with the desired token type once the protocol layer has figured this out.
   * Note that between the time DEFER is returned and the callback is invoked, strtok.parse() is buffering all data received from the stream.
   */
  export let DEFER: ISentinelToken

  /**
   * Indicates that the protocol parsing loop has come to an end, and that no more data need be read off of the stream
   * This causes strtok.parse() to disengage from the stream.
   */
  export let DONE: ISentinelToken

  export interface IPrimitiveToken {
    len: number,
    get: Get,
    put: Put
  }

  // --- Primitive types ---
  /**
   * 8-bit unsigned integer
   */
  export let UINT8: IPrimitiveToken

  /**
   * 16-bit unsigned integer, Little Endian byte order
   */
  export let UINT16_LE: IPrimitiveToken

  /**
   * 32-bit unsigned integer, Little Endian byte order
   */
  export let UINT32_LE: IPrimitiveToken

  /**
   * 32-bit unsigned integer, Big Endian byte order
   */
  export let UINT32_BE: IPrimitiveToken

  /**
   * 8-bit signed integer
   */
  export let INT8: IPrimitiveToken

  /**
   * 16-bit signed integer, Big Endian byte order
   */
  export let INT16_BE: IPrimitiveToken

  /**
   * 32-bit signed integer, Big Endian byte order
   */
  export let INT32_BE: IPrimitiveToken

  // --- Complex types ---
  //
  // These types are intended to allow callers to re-use them by manipulating
  // the 'len' and other properties directly

  export interface IComplexToken {
    len: number,
    get: Get
  }

  export class IgnoreType implements IComplexToken {
    len: number

    public get: Get

    /**
     * @param len number of bytes to consume
     */
    constructor(len: number)
  }

  export class BufferType implements IComplexToken {
    len: number

    get: Get

    /**
     * @param len number of bytes to consume
     */
    constructor(len: number)
  }

  /**
   * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
   */
  export class StringType implements IComplexToken {
    len: number

    public get: Get

    /**
     * @param len number of bytes
     * @param encoding defaults to 'utf8'
     */
    constructor(len: number, encoding?: string)
  }

  export type Token = IPrimitiveToken | ISentinelToken | IComplexToken

  /**
   * @param stream any EventEmitter that pumps out data events
   * @param cb invoked when a complete token has been read from the stream
   * @return Next token to read from the stream
   */
  export function parse (stream: EventEmitter, cb: Callback): Token
}
