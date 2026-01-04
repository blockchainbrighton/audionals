# Failure Analysis: 125KB Chunk Size

**Status:** ❌ Failed
**Error Type:** `CostBalanceExceeded` (Stacks Node API Limit)

## The Logs
The logs reveal a critical error during the `get-chunk` read-only call:

```
Error: Unchecked(CostBalanceExceeded(ExecutionCost { 
    write_length: 0, 
    write_count: 0, 
    read_length: 127052,   <-- AMOUNT REQUESTED (~124 KB)
    read_count: 5, 
    runtime: 135693 
}, ExecutionCost { 
    write_length: 0, 
    write_count: 0, 
    read_length: 100000,   <-- NETWORK LIMIT (~97 KB)
    read_count: 30, 
    runtime: 1000000000 
}))
```

## The Root Cause
While the Stacks blockchain allows **writing** large buffers (up to the block limit), the standard Hiro API nodes enforce a **Read Length Limit** of **100,000 bytes** (approx. 97.6 KB) for `read-only` function calls.

When the viewer attempted to fetch Chunk 0 (which was ~124KB), the node rejected the request because `127052 > 100000`.

## Conclusion & Action Plan
We have successfully found the "breaking point."
*   **Max Write Size:** ~1MB (Transaction limit)
*   **Max Read Size:** 100,000 bytes (Node API limit)

To ensure inscriptions are viewable by standard nodes, **chunks must stay below 100KB.**

**Action:** Reverting the application to a maximum chunk size of **64KB (u65536)**. This is the largest standard binary power of 2 that fits safely within the 100KB read limit.
