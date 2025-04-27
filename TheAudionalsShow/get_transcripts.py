from youtube_transcript_api import YouTubeTranscriptApi
import json
import sys

# List of video IDs to analyze
video_ids = [
    "kFmMPR5y8IQ",  # Audionals Unleashed: Music x Blockchain x Creator Rights
    "SCuEn9wV5H8",  # Produce Music on Bitcoin with Audionals! Jim.BTC Interview
    "jHPDhmSrr6c"   # Leather Lounge Ep. 11: Making music on Bitcoin with Audionals and Jim.btc
]

# Dictionary to store transcripts
all_transcripts = {}

# Try to get transcripts for each video
for video_id in video_ids:
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        all_transcripts[video_id] = transcript
        print(f"Successfully retrieved transcript for video ID: {video_id}")
    except Exception as e:
        print(f"Error retrieving transcript for video ID {video_id}: {str(e)}")
        all_transcripts[video_id] = None

# Save transcripts to a JSON file
with open('transcripts.json', 'w') as f:
    json.dump(all_transcripts, f, indent=2)
    print("Transcripts saved to transcripts.json")
