import sys
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt

# Define output path in artifact directory
def main():
    artifact_dir = Path(r"C:/Users/sandhiya/.gemini/antigravity/brain/d7eed581-134d-4565-9632-7a84f6415a86")
    ppt_path = artifact_dir / "ClimateSphereAI_Presentation.pptx"
    prs = Presentation()
    # Title slide
    title_slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(title_slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    title.text = "ClimateSphere AI"
    subtitle.text = "AI‑powered climate chatbot – Viva Presentation"
    # Overview slide
    bullet_layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "Project Overview"
    tf = slide.shapes.placeholders[1].text_frame
    tf.text = "• Conversational agent for climate explanations, weather, and scientific research"
    p = tf.add_paragraph(); p.text = "• Front‑end: React + Vite (GitHub Pages)"
    p = tf.add_paragraph(); p.text = "• Back‑end: FastAPI on Render (Python 3.12)"
    p = tf.add_paragraph(); p.text = "• AI providers: Google Gemini (research & vision) + Groq (fallback chat)"
    p = tf.add_paragraph(); p.text = "• External APIs: OpenWeatherMap, Gemini, Groq"
    # Architecture diagram (textual representation)
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "System Architecture"
    tf = slide.shapes.placeholders[1].text_frame
    tf.text = "Frontend (React) ↔ FastAPI (Render)"
    p = tf.add_paragraph(); p.text = "↳ Calls OpenWeatherMap for live telemetry"
    p = tf.add_paragraph(); p.text = "↳ Routes user query → Gemini (research/vision) or Groq (chat)"
    p = tf.add_paragraph(); p.text = "↳ Fallback chain: Gemini → Gemini‑lite → Groq"
    # AI Provider Details
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "AI Provider Strategy"
    tf = slide.shapes.placeholders[1].text_frame
    tf.text = "Gemini (Flash models) – primary for research & image analysis"
    p = tf.add_paragraph(); p.text = "Gemini‑3.8‑flash (primary)"
    p = tf.add_paragraph(); p.text = "Gemini‑3.5‑flash‑lite (fast fallback)"
    p = tf.add_paragraph(); p.text = "Groq (open‑source 120B) – chat & weather fallback"
    # Key Features
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "Key Features"
    tf = slide.shapes.placeholders[1].text_frame
    features = [
        "Live weather queries with OpenWeatherMap",
        "Scientific research synthesis via Gemini",
        "Multimodal image analysis (Gemini Vision)",
        "Robust fallback handling (model & provider)",
        "Adaptive time‑outs to avoid Render gateway limits",
        "Transparent error messages for end‑users",
        "Full test suite (152 passing) and CI ready"
    ]
    tf.text = "• " + features[0]
    for f in features[1:]:
        p = tf.add_paragraph(); p.text = "• " + f
    # Deployment & CI
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "Deployment & CI"
    tf = slide.shapes.placeholders[1].text_frame
    tf.text = "Render Blueprint (render.yaml) with environment variables:"
    envs = [
        "GEMINI_MODEL=gemini-3.8-flash",
        "GROQ_MODEL=openai/gpt-oss-20b",
        "ALLOWED_ORIGINS=https://sandhiyatechstar.github.io",
        "OPENWEATHER_API_KEY (secret)",
        "GEMINI_API_KEY (secret)",
        "GROQ_API_KEY (secret)"
    ]
    for e in envs:
        p = tf.add_paragraph(); p.text = "• " + e
    p = tf.add_paragraph(); p.text = "GitHub Actions run tests & build React app"
    # Testing & Reliability
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "Testing & Reliability"
    tf = slide.shapes.placeholders[1].text_frame
    tf.text = "Automated backend test suite (pytest) covering:"
    tests = [
        "Model fallback logic (Gemini → Groq)",
        "Timeout handling & adaptive read limits",
        "Weather telemetry integration",
        "Image‑vision path isolation",
        "Security audit checks"
    ]
    for t in tests:
        p = tf.add_paragraph(); p.text = "• " + t
    # Future Work
    slide = prs.slides.add_slide(bullet_layout)
    slide.shapes.title.text = "Future Enhancements"
    tf = slide.shapes.placeholders[1].text_frame
    future = [
        "Add Retrieval‑Augmented Generation (RAG) with a vector store of climate papers",
        "Support additional data sources (e.g., ERA5, CMIP6)",
        "User authentication & personalized preferences",
        "Deploy on multi‑cloud (Azure Static Web Apps) for redundancy",
        "Expand multimodal capabilities (audio & video)"
    ]
    tf.text = "• " + future[0]
    for f in future[1:]:
        p = tf.add_paragraph(); p.text = "• " + f
    # Save PPT
    prs.save(ppt_path)
    print(f"Presentation saved to {ppt_path}")

if __name__ == "__main__":
    main()
