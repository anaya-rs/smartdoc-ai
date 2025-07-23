import re
from typing import Dict, List, Tuple
import json

class QuestionAnsweringProcessor:
    def __init__(self):
        print("Q&A Processor initialized")
        self.question_patterns = {
            'amount': [
                r'(?:what|how much).{0,20}(?:total|amount|cost|price|sum)',
                r'(?:total|amount|cost|price|sum).{0,20}(?:is|was)',
                r'how much.*(?:paid|charged|cost)'
            ],
            'date': [
                r'(?:what|when).{0,20}(?:date|time|day)',
                r'(?:date|time|day).{0,20}(?:is|was)',
                r'when.*(?:paid|processed|created)'
            ],
            'name': [
                r'(?:what|who).{0,20}(?:name|person|customer)',
                r'(?:name|person|customer).{0,20}(?:is|was)',
                r'who.*(?:paid|received|sender)'
            ],
            'reference': [
                r'(?:what|which).{0,20}(?:reference|ref|id|number)',
                r'(?:reference|ref|id|number).{0,20}(?:is|was)',
                r'reference.*number'
            ],
            'purpose': [
                r'(?:what|why).{0,20}(?:purpose|reason|for)',
                r'what.*(?:paid for|purchased|buying)',
                r'purpose.*(?:payment|transaction)'
            ]
        }
        
        self.answer_patterns = {
            'amount': [
                r'(?:₹|rs\.?|inr|amount|total|sum|cost|price)\s*:?\s*([0-9,]+(?:\.[0-9]{2})?)',
                r'([0-9,]+(?:\.[0-9]{2})?)\s*(?:₹|rs\.?|inr)',
                r'amount\s*(?:paid|received|due)?\s*:?\s*([0-9,]+(?:\.[0-9]{2})?)'
            ],
            'date': [
                r'(?:date|on|dated?)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(?:date|on)\s*:?\s*(\d{1,2}\s+[a-z]+\s+\d{2,4})'
            ],
            'name': [
                r'(?:name|to|from|customer|person)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'dear\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'mr\.?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
            ],
            'reference': [
                r'(?:ref|reference|ref\.?|id|number|#)\s*:?\s*([A-Z0-9]+)',
                r'reference\s*(?:number|no\.?|#)?\s*:?\s*([A-Z0-9]+)',
                r'transaction\s*(?:id|number|ref)\s*:?\s*([A-Z0-9]+)'
            ],
            'purpose': [
                r'(?:purpose|for|description|details)\s*:?\s*([^.,\n]+)',
                r'(?:fees?|payment|bill)\s*(?:for)?\s*:?\s*([^.,\n]+)',
                r'description\s*:?\s*([^.,\n]+)'
            ]
        }

    def answer_question(self, question: str, document_text: str, key_value_pairs: dict = None) -> Dict:
        if not document_text:
            return {
                'answer': "No document content available to answer questions.",
                'confidence': 0.0,
                'question_type': 'unknown',
                'sources': []
            }

        question = question.lower().strip()
        
        question_type = self._classify_question(question)
        
        answer, confidence, sources = self._extract_answer(
            question_type, document_text, key_value_pairs or {}
        )
        
        if confidence < 0.5:
            keyword_answer = self._keyword_search(question, document_text)
            if keyword_answer:
                answer = keyword_answer
                confidence = 0.6
                sources = ['keyword_search']

        return {
            'answer': answer,
            'confidence': confidence,
            'question_type': question_type,
            'sources': sources,
            'question': question
        }

    def _classify_question(self, question: str) -> str:
        for q_type, patterns in self.question_patterns.items():
            for pattern in patterns:
                if re.search(pattern, question, re.IGNORECASE):
                    return q_type
        return 'general'

    def _extract_answer(self, question_type: str, text: str, kv_pairs: dict) -> Tuple[str, float, List[str]]:
        sources = []
        
        if kv_pairs:
            kv_answer = self._get_from_kv_pairs(question_type, kv_pairs)
            if kv_answer:
                return kv_answer, 0.9, ['key_value_pairs']
        
        if question_type in self.answer_patterns:
            patterns = self.answer_patterns[question_type]
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    answer = matches[0] if isinstance(matches[0], str) else matches[0][0]
                    sources.append('pattern_matching')
                    return self._format_answer(question_type, answer.strip()), 0.8, sources
        
        return f"I couldn't find information about {question_type} in this document.", 0.3, sources

    def _get_from_kv_pairs(self, question_type: str, kv_pairs: dict) -> str:
        extracted_pairs = kv_pairs.get('extracted_pairs', {})
        
        type_mappings = {
            'amount': ['total_amount', 'amount', 'sum', 'total'],
            'date': ['date', 'transaction_date', 'payment_date'],
            'name': ['name', 'customer_name', 'recipient'],
            'reference': ['reference', 'ref', 'transaction_id', 'invoice_number'],
            'purpose': ['purpose', 'description', 'details']
        }
        
        if question_type in type_mappings:
            for key_variant in type_mappings[question_type]:
                for actual_key, value in extracted_pairs.items():
                    if key_variant in actual_key.lower():
                        return self._format_answer(question_type, str(value))
        
        return None

    def _format_answer(self, question_type: str, answer: str) -> str:
        formatters = {
            'amount': lambda x: f"The amount is ₹{x}" if not x.startswith('₹') else f"The amount is {x}",
            'date': lambda x: f"The date is {x}",
            'name': lambda x: f"The name is {x}",
            'reference': lambda x: f"The reference number is {x}",
            'purpose': lambda x: f"The purpose is: {x}"
        }
        
        if question_type in formatters:
            return formatters[question_type](answer)
        return answer

    def _keyword_search(self, question: str, text: str) -> str:
        question_words = set(question.split()) - {'what', 'is', 'the', 'how', 'when', 'where', 'who', 'which'}
        
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        best_sentence = ""
        max_matches = 0
        
        for sentence in sentences:
            sentence_words = set(sentence.lower().split())
            matches = len(question_words.intersection(sentence_words))
            
            if matches > max_matches and matches > 0:
                max_matches = matches
                best_sentence = sentence
        
        if best_sentence and max_matches >= 1:
            return f"Based on the document: {best_sentence}"
        
        return None

    def get_suggested_questions(self, document_type: str, kv_pairs: dict = None) -> List[str]:
        base_suggestions = [
            "What is the total amount?",
            "What is the date?",
            "Who is mentioned in this document?",
            "What is the reference number?"
        ]
        
        type_specific = {
            'invoice': [
                "What is the invoice number?",
                "When is the payment due?",
                "What items were billed?"
            ],
            'receipt': [
                "What was purchased?",
                "Where was this transaction made?",
                "What is the transaction ID?"
            ],
            'contract': [
                "What are the terms?",
                "Who are the parties?",
                "When does this expire?"
            ],
            'id_document': [
                "What is the ID number?",
                "When was this issued?",
                "What is the address?"
            ]
        }
        
        suggestions = base_suggestions.copy()
        if document_type in type_specific:
            suggestions.extend(type_specific[document_type])
        
        return suggestions[:6] 