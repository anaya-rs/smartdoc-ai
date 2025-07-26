import re
from typing import Dict, List, Tuple, Optional
import json
from datetime import datetime
from collections import Counter
import spacy

class QuestionAnsweringProcessor:
    def __init__(self):
        print("Universal Q&A Processor initialized for ALL document types")
        
        # Try to load transformer model for best results
        self.transformer_available = False
        self.nlp_available = False
        
        try:
            from transformers import pipeline
            self.qa_pipeline = pipeline(
                "question-answering",
                model="distilbert-base-cased-distilled-squad",
                return_all_scores=True
            )
            self.transformer_available = True
            print("✅ AI transformer model loaded - HIGH ACCURACY MODE")
        except ImportError:
            print("⚠️ Transformers not available - using enhanced rule-based system")
        
        try:
            self.nlp = spacy.load("en_core_web_sm")
            self.nlp_available = True
            print("✅ SpaCy NLP model loaded")
        except (ImportError, OSError):
            print("⚠️ SpaCy not available - basic NLP mode")
        
        # Universal entity patterns that work for ALL document types
        self.universal_patterns = {
            'amount': [
                r'(?:₹|rs\.?|inr|usd|\$|amount|total|sum|cost|price|paid|due|charge|fee|balance)\s*:?\s*([0-9,]+(?:\.[0-9]{1,2})?)',
                r'([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr|usd|\$|rupees?|dollars?)',
                r'(?:grand\s+total|net\s+amount|final\s+amount|subtotal|tax\s+amount)\s*:?\s*([0-9,]+(?:\.[0-9]{1,2})?)',
                r'(?:invoice\s+total|bill\s+amount|payment\s+amount)\s*:?\s*([0-9,]+(?:\.[0-9]{1,2})?)'
            ],
            'date': [
                r'(?:date|on|dated?|time|day|created|issued|processed|due|expires?)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(?:date|time)\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})',
                r'(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{2,4})',
                r'(?:valid\s+until|expires?\s+on|due\s+date)\s*:?\s*([^,\n]+)'
            ],
            'name': [
                r'(?:name|to|from|customer|person|client|vendor|supplier|company|organization|issued\s+to|bill\s+to)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'(?:dear|mr\.?|mrs\.?|ms\.?|dr\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:pvt|ltd|inc|corp|company|llc)',
                r'(?:employee|staff|person)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
            ],
            'id_number': [
                r'(?:id|number|ref|reference|invoice|receipt|bill|transaction|account|policy)\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9\-]+)',
                r'(?:invoice|receipt|bill|transaction|account|employee|customer)\s*(?:number|no\.?|#|id)\s*:?\s*([A-Z0-9\-]+)',
                r'(?:ref|reference)\s*(?:number|no\.?|#)?\s*:?\s*([A-Z0-9\-]+)'
            ],
            'address': [
                r'(?:address|location|place|office|headquarters)\s*:?\s*([^,\n\r]+(?:,\s*[^,\n\r]+)*)',
                r'(?:street|road|avenue|lane|plot|house)\s*(?:no\.?|number)?\s*:?\s*([^,\n\r]+)',
                r'(?:city|state|country|pincode|zipcode|postal)\s*:?\s*([^,\n\r]+)'
            ],
            'phone': [
                r'(?:phone|mobile|contact|tel|telephone|call)\s*(?:no\.?|number)?\s*:?\s*([+\d\s\-\(\)]{10,15})',
                r'([+\d\s\-\(\)]{10,15})\s*(?:phone|mobile|contact)',
                r'(?:contact|reach)\s*(?:at|on)?\s*:?\s*([+\d\s\-\(\)]{10,15})'
            ],
            'email': [
                r'(?:email|mail|e-mail)\s*(?:id|address)?\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
            ],
            'product_service': [
                r'(?:product|service|item|description|details)\s*:?\s*([^,\n\r]+?)(?:\s*-|\s*\n|\s*,|$)',
                r'(?:for|regarding|description)\s*:?\s*([^,\n\r]+?)(?:\s*-|\s*\n|\s*,|$)',
                r'(?:services?\s+provided|work\s+performed)\s*:?\s*([^,\n\r]+)'
            ],
            'percentage': [
                r'([0-9]+(?:\.[0-9]+)?)\s*%',
                r'(?:tax|interest|rate|discount|percentage)\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*%?',
                r'(?:gst|vat|tax)\s*@?\s*([0-9]+(?:\.[0-9]+)?)\s*%'
            ]
        }
        
        # Universal question classification - works for all document types
        self.question_keywords = {
            'amount': ['amount', 'cost', 'price', 'total', 'sum', 'paid', 'money', 'charge', 'fee', 'balance', 'bill', 'invoice'],
            'date': ['date', 'time', 'when', 'day', 'month', 'year', 'created', 'issued', 'due', 'expires'],
            'name': ['name', 'who', 'person', 'customer', 'client', 'vendor', 'company', 'organization'],
            'id_number': ['number', 'id', 'reference', 'ref', 'invoice', 'receipt', 'bill', 'transaction'],
            'address': ['address', 'location', 'where', 'place', 'office'],
            'phone': ['phone', 'contact', 'mobile', 'telephone', 'call'],
            'email': ['email', 'mail', 'contact'],
            'product_service': ['product', 'service', 'item', 'description', 'what', 'details', 'work'],
            'percentage': ['percentage', 'percent', 'rate', 'tax', 'interest', 'discount']
        }

    def answer_question(self, question: str, document_text: str, key_value_pairs: dict = None) -> Dict:
        """Universal question answering for ALL document types"""
        
        if not document_text or not document_text.strip():
            return self._create_response("No document content available to analyze.", 0.0, "no_content")
        
        if not question or not question.strip():
            return self._create_response("Please provide a valid question.", 0.0, "invalid")
        
        question_original = question
        question = question.lower().strip()
        
        try:
            # STEP 1: Try AI transformer (best accuracy)
            if self.transformer_available and len(document_text) > 50:
                ai_result = self._answer_with_transformer(question, document_text)
                if ai_result and ai_result.get('confidence', 0) > 0.4:
                    ai_result['question'] = question_original
                    return ai_result
            
            # STEP 2: Try key-value pairs (structured data)
            if key_value_pairs and 'extracted_pairs' in key_value_pairs:
                kv_result = self._check_key_value_pairs(question, key_value_pairs['extracted_pairs'])
                if kv_result and kv_result.get('confidence', 0) > 0.7:
                    kv_result['question'] = question_original
                    return kv_result
            
            # STEP 3: Universal pattern matching
            pattern_result = self._universal_pattern_matching(question, document_text)
            if pattern_result and pattern_result.get('confidence', 0) > 0.5:
                pattern_result['question'] = question_original
                return pattern_result
            
            # STEP 4: NLP entity extraction
            if self.nlp_available:
                nlp_result = self._nlp_entity_extraction(question, document_text)
                if nlp_result and nlp_result.get('confidence', 0) > 0.4:
                    nlp_result['question'] = question_original
                    return nlp_result
            
            # STEP 5: Semantic sentence search
            semantic_result = self._semantic_sentence_search(question, document_text)
            if semantic_result and semantic_result.get('confidence', 0) > 0.3:
                semantic_result['question'] = question_original
                return semantic_result
            
            # STEP 6: Fallback keyword search
            keyword_result = self._advanced_keyword_search(question, document_text)
            if keyword_result:
                keyword_result['question'] = question_original
                return keyword_result
            
            return self._create_response(
                "I couldn't find specific information to answer your question in this document.",
                0.2, "not_found", [], question_original
            )
            
        except Exception as e:
            return self._create_response(
                f"Error processing question: {str(e)}", 0.0, "error", [], question_original
            )

    def _answer_with_transformer(self, question: str, document_text: str) -> Optional[Dict]:
        """Use AI transformer for best accuracy"""
        try:
            # Limit context to avoid token limits
            context = document_text[:2000]
            
            result = self.qa_pipeline(question=question, context=context)
            if isinstance(result, list):
                result = result[0]
            
            answer = result.get('answer', '').strip()
            confidence = result.get('score', 0.0)
            
            if answer and confidence > 0.1 and len(answer) > 3:
                # Enhance answer with more context
                enhanced_answer = self._enhance_answer_with_context(answer, question, document_text)
                
                return self._create_response(
                    enhanced_answer,
                    min(0.95, confidence + 0.1),
                    "ai_transformer",
                    ["AI analysis of document content"]
                )
            
            return None
            
        except Exception as e:
            print(f"Transformer error: {e}")
            return None

    def _universal_pattern_matching(self, question: str, document_text: str) -> Optional[Dict]:
        """Universal pattern matching for all document types"""
        
        # Classify question type
        question_type = self._classify_question_universal(question)
        
        if question_type in self.universal_patterns:
            patterns = self.universal_patterns[question_type]
            matches = []
            
            for pattern in patterns:
                found = re.findall(pattern, document_text, re.IGNORECASE)
                matches.extend(found)
            
            if matches:
                # Clean and deduplicate matches
                clean_matches = []
                for match in matches:
                    if isinstance(match, tuple):
                        match = match[0]
                    match = str(match).strip()
                    if len(match) > 2 and match not in clean_matches:
                        clean_matches.append(match)
                
                if clean_matches:
                    # Select best match based on context
                    best_match = self._select_best_match(clean_matches, question, document_text)
                    answer = self._format_universal_answer(question_type, best_match, question)
                    
                    return self._create_response(
                        answer, 0.8, f"pattern_{question_type}",
                        [f"Pattern matching: {question_type}"]
                    )
        
        return None

    def _nlp_entity_extraction(self, question: str, document_text: str) -> Optional[Dict]:
        """Use NLP for entity extraction"""
        try:
            doc = self.nlp(document_text[:1000])  # Limit for performance
            
            entities = {}
            for ent in doc.ents:
                label = ent.label_.lower()
                text = ent.text.strip()
                
                if label not in entities:
                    entities[label] = []
                entities[label].append(text)
            
            # Match question to entities
            question_words = set(question.split())
            
            for entity_type, entity_list in entities.items():
                if entity_type in ['person', 'org', 'money', 'date', 'gpe', 'cardinal']:
                    if any(keyword in question for keyword in ['who', 'name', 'person', 'company', 'organization']) and entity_type in ['person', 'org']:
                        return self._create_response(
                            f"Found: {', '.join(entity_list[:3])}",
                            0.7, "nlp_entity", [f"NLP entity extraction: {entity_type}"]
                        )
                    elif any(keyword in question for keyword in ['amount', 'cost', 'money', 'price']) and entity_type == 'money':
                        return self._create_response(
                            f"Amount found: {', '.join(entity_list[:3])}",
                            0.7, "nlp_entity", [f"NLP entity extraction: {entity_type}"]
                        )
            
            return None
            
        except Exception as e:
            print(f"NLP error: {e}")
            return None

    def _semantic_sentence_search(self, question: str, document_text: str) -> Optional[Dict]:
        """Search for most relevant sentences"""
        sentences = [s.strip() for s in re.split(r'[.!?]+', document_text) if s.strip() and len(s.strip()) > 20]
        
        if not sentences:
            return None
        
        question_words = set(question.lower().split())
        scored_sentences = []
        
        for sentence in sentences:
            sentence_words = set(sentence.lower().split())
            
            # Calculate similarity
            overlap = len(question_words.intersection(sentence_words))
            if overlap > 0:
                score = overlap / len(question_words)
                scored_sentences.append((sentence, score))
        
        if scored_sentences:
            scored_sentences.sort(key=lambda x: x[1], reverse=True)
            best_sentence, score = scored_sentences[0]
            
            if score > 0.2:
                return self._create_response(
                    f"Based on the document: {best_sentence}",
                    min(0.8, score * 2),
                    "semantic_search",
                    ["Sentence similarity matching"]
                )
        
        return None

    def _advanced_keyword_search(self, question: str, document_text: str) -> Optional[Dict]:
        """Advanced keyword search as final fallback"""
        question_words = [w for w in question.lower().split() if len(w) > 2 and w not in ['what', 'when', 'where', 'who', 'how', 'the', 'is', 'are']]
        
        if not question_words:
            return None
        
        sentences = [s.strip() for s in re.split(r'[.!?]+', document_text) if s.strip()]
        best_sentences = []
        
        for sentence in sentences:
            matches = sum(1 for word in question_words if word in sentence.lower())
            if matches > 0:
                score = matches / len(question_words)
                best_sentences.append((sentence, score))
        
        if best_sentences:
            best_sentences.sort(key=lambda x: x[1], reverse=True)
            best_sentence, score = best_sentences[0]
            
            return self._create_response(
                f"Related information: {best_sentence}",
                min(0.6, score),
                "keyword_search",
                ["Keyword matching"]
            )
        
        return None

    def _classify_question_universal(self, question: str) -> str:
        """Classify question type universally"""
        question_words = set(question.lower().split())
        
        scores = {}
        for q_type, keywords in self.question_keywords.items():
            score = len(question_words.intersection(set(keywords)))
            if score > 0:
                scores[q_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        return 'general'

    def _check_key_value_pairs(self, question: str, kv_pairs: dict) -> Optional[Dict]:
        """Check extracted key-value pairs"""
        question_words = set(question.lower().split())
        
        for key, value in kv_pairs.items():
            key_words = set(key.lower().replace('_', ' ').split())
            
            # Check if question keywords match key
            overlap = len(question_words.intersection(key_words))
            if overlap > 0:
                answer = f"According to the extracted data: {value}"
                return self._create_response(
                    answer, 0.9, "key_value_match",
                    [f"Key-value pair: {key} = {value}"]
                )
        
        return None

    def _format_universal_answer(self, question_type: str, answer: str, question: str) -> str:
        """Format answers based on type"""
        formatters = {
            'amount': lambda x: f"The amount is {x}" if not any(sym in str(x) for sym in ['₹', '$', 'rs']) else f"The amount is {x}",
            'date': lambda x: f"The date is {x}",
            'name': lambda x: f"The name is {x}",
            'id_number': lambda x: f"The ID/reference number is {x}",
            'address': lambda x: f"The address is: {x}",
            'phone': lambda x: f"The phone number is: {x}",
            'email': lambda x: f"The email address is: {x}",
            'product_service': lambda x: f"The product/service is: {x}",
            'percentage': lambda x: f"The percentage/rate is: {x}%"
        }
        
        if question_type in formatters:
            return formatters[question_type](answer)
        return str(answer)

    def _select_best_match(self, matches: List[str], question: str, text: str) -> str:
        """Select best match from multiple options"""
        if len(matches) == 1:
            return matches[0]
        
        # Score matches based on context relevance
        scored_matches = []
        question_words = set(question.lower().split())
        
        for match in matches:
            # Find context around match
            match_pos = text.lower().find(match.lower())
            if match_pos != -1:
                start = max(0, match_pos - 50)
                end = min(len(text), match_pos + len(match) + 50)
                context = text[start:end].lower()
                
                context_words = set(context.split())
                overlap = len(question_words.intersection(context_words))
                scored_matches.append((match, overlap))
        
        if scored_matches:
            scored_matches.sort(key=lambda x: x[1], reverse=True)
            return scored_matches[0][0]
        
        return matches[0]

    def _enhance_answer_with_context(self, answer: str, question: str, document_text: str) -> str:
        """Enhance AI answer with additional context"""
        try:
            answer_pos = document_text.lower().find(answer.lower())
            if answer_pos != -1:
                start = max(0, answer_pos - 80)
                end = min(len(document_text), answer_pos + len(answer) + 80)
                context = document_text[start:end].strip()
                
                if len(context) > len(answer) * 1.3:
                    sentences = re.split(r'[.!?]+', context)
                    relevant = [s.strip() for s in sentences if answer.lower() in s.lower()]
                    
                    if relevant and len(relevant[0]) > len(answer):
                        return relevant[0]
            
            return answer
            
        except Exception:
            return answer

    def _create_response(self, answer: str, confidence: float, question_type: str, sources: list = None, question: str = "") -> Dict:
        """Create standardized response"""
        return {
            'answer': answer,
            'confidence': round(confidence, 2),
            'question_type': question_type,
            'sources': sources or ['Document analysis'],
            'timestamp': datetime.now().isoformat(),
            'question': question
        }

    def get_suggested_questions(self, document_type: str = None, kv_pairs: dict = None) -> List[str]:
        """Generate universal question suggestions"""
        universal_suggestions = [
            "What is the total amount?",
            "What is the date mentioned?",
            "Who is involved in this document?",
            "What is the reference number?",
            "What products or services are mentioned?",
            "What is the main purpose of this document?",
            "Are there any important dates?",
            "What contact information is provided?"
        ]
        
        type_specific = {
            'invoice': [
                "What is the invoice number?",
                "Who is the vendor?",
                "What is the due date?",
                "What items were billed?"
            ],
            'receipt': [
                "What store is this from?",
                "What was purchased?",
                "What payment method was used?",
                "What is the transaction ID?"
            ],
            'contract': [
                "What are the main terms?",
                "Who are the parties?",
                "What is the contract duration?",
                "What are the payment terms?"
            ],
            'report': [
                "What are the key findings?",
                "What data is presented?",
                "What are the conclusions?",
                "What recommendations are made?"
            ]
        }
        
        suggestions = universal_suggestions.copy()
        if document_type and document_type in type_specific:
            suggestions.extend(type_specific[document_type])
        
        return suggestions[:8]

