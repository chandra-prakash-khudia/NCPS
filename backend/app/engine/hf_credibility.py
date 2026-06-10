"""
HF Credibility Engine — C_ML via Hugging Face Inference API.

Model: jy46604790/Fake-News-Bert-Detect (RoBERTa trained on 40k+ news articles)
  LABEL_0 → Fake news
  LABEL_1 → Real news

Label → C_ML mapping:
  LABEL_1 score  →  C_ML = score           (high = credible)
  LABEL_0 score  →  C_ML = 1 - score       (high fake conf = low credibility)

If the API is unavailable or the token is missing, returns None (falls back to C_Bayes only).
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import config

logger = logging.getLogger(__name__)

_HF_API_URL = (
    "https://api-inference.huggingface.co/models/"
    "jy46604790/Fake-News-Bert-Detect"
)
_TIMEOUT = 10.0  # seconds


def predict_credibility(content: str) -> Optional[float]:
    """
    Call the HF Inference API and return C_ML ∈ [0, 1].

    Returns None if:
    - HF_API_TOKEN is not set
    - API returns an error (model loading, rate limit, network)
    - Content is empty

    Args:
        content: Raw text of the news post.

    Returns:
        C_ML ∈ [0, 1] where 1.0 = fully credible, 0.0 = fake.
        None = API unavailable, use C_Bayes only.
    """
    token = config.hf_api_token
    if not token:
        logger.debug("HF_API_TOKEN not set — skipping C_ML prediction")
        return None

    text = content.strip()
    if not text:
        return None

    # Truncate to ~500 words as per model docs
    words = text.split()
    if len(words) > 500:
        text = " ".join(words[:500])

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"inputs": text}

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(_HF_API_URL, json=payload, headers=headers)

        if response.status_code == 503:
            # Model is loading — common on free tier cold start
            logger.warning("HF model is loading (503) — C_ML skipped, will retry")
            return None

        if response.status_code != 200:
            logger.warning(
                "HF API error %d: %s", response.status_code, response.text[:200]
            )
            return None

        data = response.json()

        # Response format: [[{"label": "LABEL_0", "score": 0.92}, {"label": "LABEL_1", "score": 0.08}]]
        if isinstance(data, list) and len(data) > 0:
            results = data[0] if isinstance(data[0], list) else data
        else:
            logger.warning("Unexpected HF API response format: %s", str(data)[:200])
            return None

        label_scores: dict[str, float] = {}
        for item in results:
            if isinstance(item, dict) and "label" in item and "score" in item:
                label_scores[item["label"]] = float(item["score"])

        if not label_scores:
            logger.warning("No label_scores parsed from HF response")
            return None

        # Map to credibility: LABEL_1 = Real (credible), LABEL_0 = Fake (not credible)
        if "LABEL_1" in label_scores:
            c_ml = label_scores["LABEL_1"]
        elif "LABEL_0" in label_scores:
            c_ml = 1.0 - label_scores["LABEL_0"]
        else:
            logger.warning("Unexpected labels in HF response: %s", label_scores)
            return None

        c_ml = min(max(c_ml, 0.0), 1.0)
        logger.debug("HF C_ML prediction: %.3f (labels=%s)", c_ml, label_scores)
        return c_ml

    except httpx.TimeoutException:
        logger.warning("HF API timed out after %.1fs — C_ML skipped", _TIMEOUT)
        return None
    except httpx.RequestError as exc:
        logger.warning("HF API network error: %s", exc)
        return None
    except Exception:
        logger.exception("Unexpected error calling HF API")
        return None
