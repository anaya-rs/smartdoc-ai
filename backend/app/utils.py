import re
from typing import Dict, List, Tuple
import numpy as np

class KeyValueExtractor:
    def __init__(self):
        self.common_patterns = {
            'invoice_number': [
                r'invoice\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-]+)',
                r'invoice\s*([A-Z0-9\-]+)',
                r'inv\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-]+)'
            ],
            'total_amount': [
                r'total\s*:?\s*\$?([0-9,]+\.?\d*)',
                r'amount\s*due\s*:?\s*\$?([0-9,]+\.?\d*)',
                r'grand\s*total\s*:?\s*\$?([0-9,]+\.?\d*)'
            ],
            'date': [
                r'date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'invoice\s*date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'due\s*date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ],
            'vendor_name': [
                r'from\s*:?\s*([A-Za-z\s&,.]+?)(?:\n|$)',
                r'vendor\s*:?\s*([A-Za-z\s&,.]+?)(?:\n|$)',
                r'bill\s*to\s*:?\s*([A-Za-z\s&,.]+?)(?:\n|$)'
            ]
        }
    
    def extract_key_value_pairs(self, text: str, bounding_boxes: List[Dict] = None) -> Dict:
        """Extract key-value pairs from text"""
        pairs = {}
        
        # Pattern-based extraction
        for key, patterns in self.common_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    pairs[key] = match.group(1).strip()
                    break
        
        if bounding_boxes:
            proximity_pairs = self._extract_proximity_pairs(bounding_boxes)
            pairs.update(proximity_pairs)
        
        generic_pairs = self._extract_generic_patterns(text)
        
        for key, value in generic_pairs.items():
            if key not in pairs:
                pairs[key] = value
        
        return {
            'extracted_pairs': pairs,
            'pair_count': len(pairs)
        }
    
    def _extract_proximity_pairs(self, bounding_boxes: List[Dict]) -> Dict:
        """Extract key-value pairs based on proximity in bounding boxes"""
        pairs = {}
        
        lines = self._group_by_lines(bounding_boxes)
        
        for line in lines:
            line_text = ' '.join([box['text'] for box in line])
            colon_pairs = self._extract_colon_pairs(line_text)
            pairs.update(colon_pairs)
            
            adjacent_pairs = self._extract_adjacent_pairs(line)
            pairs.update(adjacent_pairs)
        
        return pairs
    
    def _group_by_lines(self, bounding_boxes: List[Dict]) -> List[List[Dict]]:
        if not bounding_boxes:
            return []
        
        sorted_boxes = sorted(bounding_boxes, key=lambda x: x['bounding_box']['y'])
        
        lines = []
        current_line = [sorted_boxes[0]]
        line_y = sorted_boxes[0]['bounding_box']['y']
        tolerance = 10 
        
        for box in sorted_boxes[1:]:
            box_y = box['bounding_box']['y']
            
            if abs(box_y - line_y) <= tolerance:
                current_line.append(box)
            else:
                current_line.sort(key=lambda x: x['bounding_box']['x'])
                lines.append(current_line)
                current_line = [box]
                line_y = box_y
        
        if current_line:
            current_line.sort(key=lambda x: x['bounding_box']['x'])
            lines.append(current_line)
        
        return lines
    
    def _extract_colon_pairs(self, text: str) -> Dict:
        pairs = {}
        
        colon_pattern = r'([A-Za-z\s]+?):\s*([A-Za-z0-9\s\-\$\.,]+?)(?:\s|$)'
        matches = re.findall(colon_pattern, text)
        
        for key, value in matches:
            clean_key = key.strip().lower().replace(' ', '_')
            clean_value = value.strip()
            
            if clean_key and clean_value and len(clean_value) > 0:
                pairs[clean_key] = clean_value
        
        return pairs
    
    def _extract_adjacent_pairs(self, line_boxes: List[Dict]) -> Dict:
        pairs = {}
        
        for i in range(len(line_boxes) - 1):
            current_box = line_boxes[i]
            next_box = line_boxes[i + 1]
            
            current_text = current_box['text'].strip()
            next_text = next_box['text'].strip()
            
            if self._is_potential_key(current_text) and self._is_potential_value(next_text):
                key = current_text.lower().replace(':', '').replace(' ', '_')
                pairs[key] = next_text
        
        return pairs
    
    def _is_potential_key(self, text: str) -> bool:
        clean_text = re.sub(r'[^\w\s]', '', text)
        
        key_indicators = [
            len(clean_text.split()) <= 3,  # Usually short
            text.endswith(':'),  # Often ends with colon
            any(word in text.lower() for word in ['number', 'name', 'date', 'amount', 'total', 'id']),
            text.isupper() or text.istitle()  # Often capitalized
        ]
        
        return sum(key_indicators) >= 2
    
    def _is_potential_value(self, text: str) -> bool:
        if not text or len(text.strip()) == 0:
            return False
        
        if re.match(r'^[^\w]*$', text):
            return False
        
        return True
    
    def _extract_generic_patterns(self, text: str) -> Dict:
        pairs = {}
        
        # Generic patterns
        patterns = [
            # Amount patterns
            (r'(\w+\s*amount)\s*:?\s*\$?([0-9,]+\.?\d*)', 'amount'),
            # Number patterns
            (r'(\w+\s*(?:number|no|#))\s*:?\s*([A-Z0-9\-]+)', 'number'),
            # Date patterns
            (r'(\w+\s*date)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', 'date'),
            # ID patterns
            (r'(\w+\s*id)\s*:?\s*([A-Z0-9\-]+)', 'id')
        ]
        
        for pattern, category in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for key, value in matches:
                clean_key = key.strip().lower().replace(' ', '_').replace(':', '')
                pairs[f"{category}_{clean_key}"] = value.strip()
        
        return pairs

def create_sample_users():
    """Create sample users for testing"""
    from backend.database import SessionLocal
    from app.models import User
    from app.auth import get_password_hash
    
    db = SessionLocal()
    
    existing_user = db.query(User).filter(User.username == "admin").first()
    if existing_user:
        db.close()
        return
    
    users = [
        {
            "username": "admin",
            "email": "admin@smartdoc.ai",
            "password": "admin123"
        },
        {
            "username": "demo",
            "email": "demo@smartdoc.ai", 
            "password": "demo123"
        }
    ]
    
    for user_data in users:
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"])
        )
        db.add(user)
    
    db.commit()
    db.close()
    print("Sample users created successfully!")
