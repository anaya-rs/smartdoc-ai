import re
from typing import Dict, List, Tuple
import spacy
from datetime import datetime

class DataRedactor:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
            self.use_spacy = True
        except OSError:
            self.nlp = None
            self.use_spacy = False
            print("Warning: spaCy model not found. Using pattern-based redaction only.")
    
    def redact_sensitive_data(self, text: str, redaction_options: Dict = None) -> Dict:
        if redaction_options is None:
            redaction_options = {
                'names': True,
                'emails': True,
                'phones': True,
                'ssn': True,
                'addresses': True,
                'dates_of_birth': True,
                'credit_cards': True
            }
        
        redacted_text = text
        redactions = []
        
        # Email addresses
        if redaction_options.get('emails', True):
            redacted_text, email_redactions = self._redact_emails(redacted_text)
            redactions.extend(email_redactions)
        
        # Phone numbers
        if redaction_options.get('phones', True):
            redacted_text, phone_redactions = self._redact_phones(redacted_text)
            redactions.extend(phone_redactions)
        
        # SSN
        if redaction_options.get('ssn', True):
            redacted_text, ssn_redactions = self._redact_ssn(redacted_text)
            redactions.extend(ssn_redactions)
        
        # Credit card numbers
        if redaction_options.get('credit_cards', True):
            redacted_text, cc_redactions = self._redact_credit_cards(redacted_text)
            redactions.extend(cc_redactions)
        
        # Dates of birth
        if redaction_options.get('dates_of_birth', True):
            redacted_text, dob_redactions = self._redact_dates_of_birth(redacted_text)
            redactions.extend(dob_redactions)
        
        # Names (using spaCy if available)
        if redaction_options.get('names', True):
            if self.use_spacy:
                redacted_text, name_redactions = self._redact_names_spacy(redacted_text)
            else:
                redacted_text, name_redactions = self._redact_names_pattern(redacted_text)
            redactions.extend(name_redactions)
        
        # Addresses
        if redaction_options.get('addresses', True):
            redacted_text, address_redactions = self._redact_addresses(redacted_text)
            redactions.extend(address_redactions)
        
        return {
            'redacted_text': redacted_text,
            'original_text': text,
            'redactions': redactions,
            'redaction_count': len(redactions)
        }
    
    def _redact_emails(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact email addresses"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        redactions = []
        
        def replace_email(match):
            email = match.group()
            redactions.append({
                'type': 'email',
                'original': email,
                'start': match.start(),
                'end': match.end()
            })
            return '[EMAIL_REDACTED]'
        
        redacted_text = re.sub(email_pattern, replace_email, text)
        return redacted_text, redactions
    
    def _redact_phones(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact phone numbers"""
        phone_patterns = [
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # (123) 456-7890 or 123-456-7890
            r'\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}',  # International
        ]
        
        redactions = []
        redacted_text = text
        
        for pattern in phone_patterns:
            def replace_phone(match):
                phone = match.group()
                redactions.append({
                    'type': 'phone',
                    'original': phone,
                    'start': match.start(),
                    'end': match.end()
                })
                return '[PHONE_REDACTED]'
            
            redacted_text = re.sub(pattern, replace_phone, redacted_text)
        
        return redacted_text, redactions
    
    def _redact_ssn(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact Social Security Numbers"""
        ssn_pattern = r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b'
        redactions = []
        
        def replace_ssn(match):
            ssn = match.group()
            redactions.append({
                'type': 'ssn',
                'original': ssn,
                'start': match.start(),
                'end': match.end()
            })
            return '[SSN_REDACTED]'
        
        redacted_text = re.sub(ssn_pattern, replace_ssn, text)
        return redacted_text, redactions
    
    def _redact_credit_cards(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact credit card numbers"""
        cc_pattern = r'\b(?:\d{4}[-\s]?){3}\d{4}\b'
        redactions = []
        
        def replace_cc(match):
            cc = match.group()
            redactions.append({
                'type': 'credit_card',
                'original': cc,
                'start': match.start(),
                'end': match.end()
            })
            return '[CREDIT_CARD_REDACTED]'
        
        redacted_text = re.sub(cc_pattern, replace_cc, text)
        return redacted_text, redactions
    
    def _redact_dates_of_birth(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact potential dates of birth"""
        # Look for dates that might be DOB (born in 1900-2020)
        dob_patterns = [
            r'\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b',  # YYYY-MM-DD
            r'\b\d{1,2}[-/]\d{1,2}[-/](?:19|20)\d{2}\b',  # MM-DD-YYYY
        ]
        
        redactions = []
        redacted_text = text
        
        for pattern in dob_patterns:
            def replace_dob(match):
                dob = match.group()
                redactions.append({
                    'type': 'date_of_birth',
                    'original': dob,
                    'start': match.start(),
                    'end': match.end()
                })
                return '[DOB_REDACTED]'
            
            redacted_text = re.sub(pattern, replace_dob, redacted_text)
        
        return redacted_text, redactions
    
    def _redact_names_spacy(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact names using spaCy NER"""
        doc = self.nlp(text)
        redactions = []
        redacted_text = text
        
        # Process entities in reverse order to maintain text positions
        entities = [(ent.start_char, ent.end_char, ent.text, ent.label_) for ent in doc.ents]
        entities.sort(key=lambda x: x[0], reverse=True)
        
        for start, end, entity_text, label in entities:
            if label == "PERSON":
                redactions.append({
                    'type': 'person_name',
                    'original': entity_text,
                    'start': start,
                    'end': end
                })
                redacted_text = redacted_text[:start] + '[NAME_REDACTED]' + redacted_text[end:]
        
        return redacted_text, redactions
    
    def _redact_names_pattern(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact names using pattern matching (fallback)"""
        name_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b'
        redactions = []
        
        exclude_words = {
            'United States', 'New York', 'Los Angeles', 'Dear Sir', 'Dear Madam',
            'Thank You', 'Best Regards', 'Invoice Number', 'Account Number'
        }
        
        def replace_name(match):
            name = match.group()
            if name not in exclude_words and len(name.split()) >= 2:
                redactions.append({
                    'type': 'potential_name',
                    'original': name,
                    'start': match.start(),
                    'end': match.end()
                })
                return '[NAME_REDACTED]'
            return name
        
        redacted_text = re.sub(name_pattern, replace_name, text)
        return redacted_text, redactions
    
    def _redact_addresses(self, text: str) -> Tuple[str, List[Dict]]:
        """Redact addresses"""
        address_patterns = [
            r'\d+\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Place|Pl)\.?\s*,?\s*\w*',
            r'\b\d{5}(?:-\d{4})?\b'  # ZIP codes
        ]
        
        redactions = []
        redacted_text = text
        
        for pattern in address_patterns:
            def replace_address(match):
                address = match.group()
                redactions.append({
                    'type': 'address',
                    'original': address,
                    'start': match.start(),
                    'end': match.end()
                })
                return '[ADDRESS_REDACTED]'
            
            redacted_text = re.sub(pattern, replace_address, redacted_text, flags=re.IGNORECASE)
        
        return redacted_text, redactions
