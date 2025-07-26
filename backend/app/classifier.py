import re
from typing import Dict, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import os

class DocumentClassifier:
    def __init__(self):
        print("DocumentClassifier initialized with local AI")
        self.ai_summarizer = None
        
        try:
            from transformers import pipeline
            # Use a good summarization model
            self.ai_summarizer = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=-1  # Use CPU, set to 0 for GPU
            )
            print("✅ Local AI summarization model loaded")
        except ImportError:
            print("⚠️ Transformers not available - falling back to rule-based")
        except Exception as e:
            print(f"⚠️ AI model loading failed: {e} - falling back to rule-based")

    def classify_document(self, text):
        if not text or len(text.strip()) < 10:
            return {'type': 'unknown', 'confidence': 0.3}

        text_lower = text.lower()
        
        # Enhanced classification with AI context
        if any(keyword in text_lower for keyword in ['ingredients', 'recipe', 'cooking', 'bake', 'cook', 'servings', 'prep time', 'directions', 'method']):
            return {'type': 'recipe', 'confidence': 0.9}
        elif any(keyword in text_lower for keyword in ['invoice', 'bill', 'total', 'amount due', 'payment']):
            return {'type': 'invoice', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['receipt', 'purchase', 'transaction', 'paid']):
            return {'type': 'receipt', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['contract', 'agreement', 'terms', 'party', 'whereas']):
            return {'type': 'contract', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['id', 'license', 'passport', 'card', 'identification']):
            return {'type': 'id_document', 'confidence': 0.7}
        elif any(keyword in text_lower for keyword in ['report', 'analysis', 'findings', 'conclusion', 'summary']):
            return {'type': 'report', 'confidence': 0.7}
        else:
            return {'type': 'document', 'confidence': 0.6}

    def generate_ai_overview(self, text, document_type):
        """Generate AI-powered intelligent overview"""
        if not text or len(text.strip()) < 20:
            return "This document appears to be empty or could not be processed properly."
        
        # Use AI summarization if available
        if self.ai_summarizer and len(text.strip()) > 100:
            try:
                # Prepare text for AI summarization
                cleaned_text = self._prepare_text_for_ai(text, document_type)
                
                # Generate AI summary
                ai_summary = self._generate_ai_summary(cleaned_text, document_type)
                
                if ai_summary:
                    return ai_summary
                    
            except Exception as e:
                print(f"AI overview generation failed: {e}")
        
        # Fallback to enhanced rule-based overview
        return self._generate_enhanced_overview(text, document_type)

    def _prepare_text_for_ai(self, text, document_type):
        """Prepare text for AI processing"""
        # Clean and limit text length for AI model
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Remove excessive whitespace and special characters
        cleaned_lines = []
        for line in lines:
            if len(line) > 3:  # Skip very short lines
                cleaned_lines.append(line)
        
        # Limit to first 800 words for AI processing
        full_text = ' '.join(cleaned_lines)
        words = full_text.split()
        
        if len(words) > 800:
            full_text = ' '.join(words[:800]) + "..."
        
        return full_text

    def _generate_ai_summary(self, text, document_type):
        """Generate AI-powered summary with document context"""
        try:
            # Create context-aware prompt based on document type
            prompts = {
                'recipe': f"Summarize this recipe including the dish name, main ingredients, and cooking method: {text}",
                'invoice': f"Summarize this invoice including the vendor, items, and total amount: {text}",
                'receipt': f"Summarize this receipt including the store, items purchased, and total: {text}",
                'contract': f"Summarize this contract including the parties, purpose, and key terms: {text}",
                'report': f"Summarize this report including the main findings and conclusions: {text}",
                'id_document': f"Summarize this identification document including the type and key information: {text}",
                'document': f"Summarize the main content and purpose of this document: {text}"
            }
            
            prompt_text = prompts.get(document_type, prompts['document'])
            
            # Generate summary using AI
            summary_result = self.ai_summarizer(
                prompt_text,
                max_length=150,  # Limit summary length
                min_length=30,   # Minimum summary length
                do_sample=False,
                num_beams=4
            )
            
            if summary_result and len(summary_result) > 0:
                ai_summary = summary_result[0]['summary_text']
                
                # Post-process AI summary
                formatted_summary = self._format_ai_summary(ai_summary, document_type, text)
                return formatted_summary
                
        except Exception as e:
            print(f"AI summarization error: {e}")
            return None
        
        return None

    def _format_ai_summary(self, ai_summary, document_type, original_text):
        """Format and enhance AI-generated summary"""
        # Clean up AI output
        summary = ai_summary.strip()
        
        # Add document type context
        type_prefixes = {
            'recipe': 'This image contains a recipe for',
            'invoice': 'This document is an invoice that',
            'receipt': 'This receipt shows',
            'contract': 'This contract outlines',
            'report': 'This report presents',
            'id_document': 'This identification document contains',
            'document': 'This document contains'
        }
        
        prefix = type_prefixes.get(document_type, 'This document contains')
        
        # Enhance with specific details
        word_count = len(original_text.split())
        
        # Extract key metrics based on document type
        additional_info = self._extract_key_metrics(original_text, document_type)
        
        formatted = f"{prefix} {summary.lower()} {additional_info}The document contains approximately {word_count:,} words of content."
        
        return formatted

    def _extract_key_metrics(self, text, document_type):
        """Extract key metrics to enhance AI summary"""
        import re
        
        metrics = ""
        text_lower = text.lower()
        
        if document_type == 'recipe':
            # Extract servings
            servings_match = re.search(r'serv(?:ing|es)?\s*:?\s*(\d+)', text_lower)
            if servings_match:
                metrics += f"for {servings_match.group(1)} servings "
            
            # Extract time
            time_match = re.search(r'(?:prep|cook|total)\s*time\s*:?\s*(\d+)\s*(?:min|hour)', text_lower)
            if time_match:
                metrics += f"with {time_match.group(1)} minutes preparation time. "
        
        elif document_type == 'invoice':
            # Extract amount
            amount_match = re.search(r'total\s*:?\s*[$₹]?([0-9,]+\.?\d*)', text_lower)
            if amount_match:
                metrics += f"totaling ${amount_match.group(1)}. "
        
        elif document_type == 'receipt':
            # Extract store and amount
            total_match = re.search(r'total\s*:?\s*[$₹]?([0-9,]+\.?\d*)', text_lower)
            if total_match:
                metrics += f"with a total of ${total_match.group(1)}. "
        
        return metrics

    def _generate_enhanced_overview(self, text, document_type):
        """Enhanced rule-based overview as fallback"""
        word_count = len(text.split())
        
        # Extract first meaningful line as subject
        lines = [line.strip() for line in text.split('\n') if line.strip() and len(line) > 5]
        
        subject = "various content"
        if lines:
            # Find the most likely title/subject line
            for line in lines[:5]:
                if len(line) < 100 and not any(word in line.lower() for word in ['ingredients', 'step', 'total', 'amount', 'date']):
                    subject = f"**{line}**"
                    break
        
        type_descriptions = {
            'recipe': f'This image contains a recipe for {subject}. The recipe includes ingredients, cooking instructions, and preparation steps',
            'invoice': f'This document is an invoice regarding {subject}. It contains billing information, itemized charges, and payment details',
            'receipt': f'This receipt shows a transaction for {subject}. It includes purchase details, amounts, and payment information',
            'contract': f'This contract pertains to {subject}. It outlines legal terms, conditions, and obligations between parties',
            'report': f'This report discusses {subject}. It presents analysis, findings, and conclusions',
            'id_document': f'This identification document contains personal information and verification details',
            'document': f'This document contains information about {subject}'
        }
        
        base_description = type_descriptions.get(document_type, type_descriptions['document'])
        
        return f"{base_description} with approximately {word_count:,} words of content."
