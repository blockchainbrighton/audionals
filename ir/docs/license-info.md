**Short answer**

*You don’t have to touch the CC-BY-SA-Web3 licence **if the royalty split is purely optional** (a “good-karma” norm or an on-platform incentive).


## 1  What the current licence really says about money

* **Royalty-free by design** – Section 2(a)(5)(A) of every modern CC-BY and CC-BY-SA licence says the licensor “waives any right to collect royalties … for the exercise of the licensed rights”.
* **No additional restrictions** – Share-Alike allows you to add *permissions*, but you cannot add *obligations* that go beyond attribution + share-alike; otherwise the work stops being “CC-BY-SA” and breaks compatibility.

So a licencee may legally mint, stream or resell your sample without paying you a cent, and you cannot revoke those rights later.

---

## 2  What *is* allowed without changing the licence

| Technique                                                                                          | Why it’s compatible                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Voluntary tips / “pay-what-you-want”**                                                           | The user can always refuse, so there’s no extra legal restriction.                                                                                                              |
| **Marketplace rule that *it* shares 20 % of sales**                                                | The obligation is in the *platform’s* Terms of Service, not in the licence. Users remain free to take the asset elsewhere under plain CC-BY-SA.                                 |
| **On-chain royalty splitter baked into the NFT contract (EIP-2981, ERC-1155 royalty extensions)**  | Smart-contract royalties fire only when the NFT changes hands *on a supporting market*. Off-chain uses or private transfers are still royalty-free, keeping the licence intact. |
| **“CC +” badge** – a link that says: “If you’d like to support creators, we suggest a 20 % share.” | CC+ is Creative Commons’ own mechanism for offering *extra* permissions or services alongside an unchanged CC licence.                                                          |

None of these adds a *legal* payment duty; they just make paying frictionless or socially expected. That satisfies your wish that people can “do the right thing” while staying 100 % CC-compatible.

---

## 3  When you *have* to adopt a different licence

| Goal                                                                         | Why CC-BY-SA won’t work                                                                                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compulsory royalty anywhere the sample is used** (on-chain *or* off-chain) | CC’s royalty waiver is irrevocable. You would have to publish under a new copyleft-style licence that *permits use* **only** if the revenue share is honoured. |
| **Right to audit or sue for unpaid splits**                                  | That is an “additional restriction” forbidden under CC-BY-SA.                                                                                                  |

If you go down this path you must:

1. **Rename the licence** (Creative Commons asks you not to call it “CC-BY-SA” once it’s modified).
2. Accept that the new licence will **not be Share-Alike-compatible** with the global CC commons, which may reduce adoption.
3. Write (or adopt) clear legal text for royalty calculation, jurisdiction, enforcement, dispute resolution, etc.

---

## 4  Practical recipe: keep CC-BY-SA + build a marketplace splitter

1. **Publish the stems as CC-BY-SA-Web3.**
2. **Embed asset-IDs and split percentages** in token metadata (e.g., an `royaltyRecipients` array).
3. **When someone mints or lists a derivative track on BAM:**

   * The contract reads all sub-asset IDs, aggregates the declared splits, and auto-routes 20 % of each sale to those addresses.
4. **Outside BAM** the file is still CC-BY-SA. If another service ignores your splits, that’s lawful—just not “playing fair.”
5. **Market the norm.** Make it clear in docs and UI that “BAM royalties” are a community standard, not a legal requirement, and highlight artists who respect it.

This gives you the *incentive* structure you want without losing the network effects of an internationally recognised, truly free licence.

---

## 5  Decision tree

```text
Want a hard-wired, enforceable royalty on every use?
        │
        ├─► YES  →  Write/choose a new licence (can’t call it “CC-BY-SA”)
        │
        └─► NO   →  Keep CC-BY-SA-Web3, add voluntary smart-contract or platform-level royalty splitter
```

---

### Bottom line

Stick with **CC-BY-SA-Web3** if you’re happy for royalties to be *encouraged and automated* but not legally compulsory.
If you ever need the royalty to be *mandatory everywhere*, you’ll have to switch to—or dual-license with—a new revenue-sharing licence and accept the trade-offs in reach and remixability.

*Either way, the technology layer (smart contracts, IDs, royalty splitters) is where you implement the 20 % share—not in the Creative Commons legal code itself.*

---

**Key sources**

* CC-BY-SA licence text, royalty-waiver clause&#x20;
* Creative Commons “CC+” add-on protocol&#x20;
* CC 4.0 handling of collecting-society royalties&#x20;

These confirm that CC allows *voluntary* payments but forbids compulsory royalties under the Share-Alike flag.
