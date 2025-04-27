import json

# Function to summarize text (placeholder for manual summarization)
def summarize_text(video_id, transcript_text):
    # Manual summarization based on reading the transcript content
    if video_id == "kFmMPR5y8IQ":
        summary = ("Jim Crane (Jim.BTC) presents Audionals at Bitcoin Unleashed. He discusses his background as a music producer and tour manager, highlighting the issues with music royalties. He details his journey into crypto, starting with importing the UK's first Bitcoin ATM in 2014, meeting Stacks core developer Mike Cohen, and co-founding 'This is #1', the first NFT marketplace on Stacks. The marketplace initially focused on music NFTs, collaborating with artists like Fatboy Slim, Orbital, and Cara Delevingne. Jim explains the shift to Bitcoin Ordinals, emphasizing their nature as single, on-chain entities combining content and ownership. He introduces Audionals as a project born from the desire to fix the music industry's broken system, leveraging Ordinals to create on-chain music tools and foster a decentralized music ecosystem.")
    elif video_id == "SCuEn9wV5H8":
        summary = ("In this interview on Digital Assets Explained, Jim.BTC discusses Audionals, a free music sequencer available on-chain via Bitcoin Ordinals. He explains his motivation stemming from the complexities of music royalties and his history in the crypto space, including founding 'This is #1' on Stacks. Jim highlights how Ordinals enable fully on-chain, interactive music experiences. He demos the Audionals sequencer, showcasing its features like pattern creation, instrument selection (synths, drums), and the ability to inscribe the final musical piece directly onto Bitcoin as an Ordinal. The discussion touches on the potential for collaborative music creation and the future of decentralized music production.")
    elif video_id == "jHPDhmSrr6c":
        summary = ("Jim.btc joins the Leather Lounge podcast to discuss Audionals. He shares his extensive background in the music industry and his early involvement in Bitcoin, including bringing the first Bitcoin ATM to the UK. Jim explains the concept behind Audionals: creating music tools and experiences directly on the Bitcoin blockchain using Ordinals. He contrasts this with earlier NFT projects on Stacks ('This is #1'), emphasizing the unique properties of Ordinals. The conversation covers the technical aspects of inscribing music data, the potential for artists to control their work, and the broader vision for a decentralized music ecosystem built on Bitcoin.")
    else:
        summary = "Summary not available."
    return summary

# Load transcripts from JSON file
try:
    with open('transcripts.json', 'r') as f:
        all_transcripts = json.load(f)
except FileNotFoundError:
    print("Error: transcripts.json not found.")
    exit()
except json.JSONDecodeError:
    print("Error: Could not decode transcripts.json.")
    exit()

# Prepare summaries
summaries_content = "# Episode Summaries\n\n"

video_titles = {
    "kFmMPR5y8IQ": "Audionals Unleashed: Music x Blockchain x Creator Rights - Bitcoin Unleashed",
    "SCuEn9wV5H8": "Produce Music on Bitcoin with Audionals! Jim.BTC Interview - Ordinals Inscriptions",
    "jHPDhmSrr6c": "Leather Lounge Ep. 11: Making music on Bitcoin with Audionals and Jim.btc"
}

for video_id, transcript_data in all_transcripts.items():
    if transcript_data:
        full_text = " ".join([item['text'] for item in transcript_data])
        summary = summarize_text(video_id, full_text)
        title = video_titles.get(video_id, video_id) # Get title or use ID if not found
        summaries_content += f"## {title} (ID: {video_id})\n\n{summary}\n\n"
    else:
        title = video_titles.get(video_id, video_id)
        summaries_content += f"## {title} (ID: {video_id})\n\nTranscript not available for summarization.\n\n"

# Save summaries to a markdown file
with open('episode_summaries.md', 'w') as f:
    f.write(summaries_content)
    print("Summaries saved to episode_summaries.md")

