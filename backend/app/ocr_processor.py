import fitz
import easyocr
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import logging
import os
import io
from typing import Dict, List, Tuple
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCRProcessor:
    def __init__(self):
        self.reader = None
        self.tesseract_available = False
        
        try:
            self.reader = easyocr.Reader(['en'], gpu=False, download_enabled=True)
            logger.info("Enhanced EasyOCR initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {e}")

        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self.tesseract_available = True
            logger.info("Tesseract OCR available as backup")
        except:
            logger.info("Tesseract not available")

    def process_document(self, file_path: str) -> Dict:
        if not os.path.exists(file_path):
            return {'text': '', 'bounding_boxes': [], 'word_count': 0}

        file_ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if file_ext == '.pdf':
                return self._process_pdf(file_path)
            else:
                return self._process_image(file_path)
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            return {'text': f'Error: {str(e)}', 'bounding_boxes': [], 'word_count': 0}

    def _process_image(self, file_path: str) -> Dict:
        try:
            pil_image = Image.open(file_path)
            
            if self.reader:
                image_array = np.array(pil_image)
                
                try:
                    results = self.reader.readtext(image_array, detail=1, paragraph=False)
                    
                    if results:
                        text_parts = []
                        bounding_boxes = []
                        
                        for result in results:
                            if len(result) >= 3 and result[2] > 0.3:
                                bbox, text, confidence = result[:3]
                                if text and text.strip():
                                    text_parts.append(text.strip())
                                    bounding_boxes.append({
                                        'text': text.strip(),
                                        'bbox': bbox,
                                        'confidence': confidence
                                    })
                        
                        final_text = ' '.join(text_parts)
                        word_count = len(final_text.split()) if final_text else 0
                        
                        if word_count > 0:
                            return {
                                'text': final_text,
                                'bounding_boxes': bounding_boxes,
                                'word_count': word_count,
                                'pages_processed': 1
                            }
                
                except Exception as e:
                    logger.error(f"EasyOCR failed: {e}")
            
            if self.tesseract_available:
                try:
                    import pytesseract
                    image_array = np.array(pil_image)
                    
                    configs = [
                        r'--oem 3 --psm 6',
                        r'--oem 3 --psm 4',
                        r'--oem 3 --psm 3',
                        r'--oem 1 --psm 6'
                    ]
                    
                    best_text = ""
                    best_word_count = 0
                    
                    for config in configs:
                        try:
                            text = pytesseract.image_to_string(image_array, config=config)
                            if text:
                                text = text.strip()
                                word_count = len(text.split())
                                if word_count > best_word_count:
                                    best_text = text
                                    best_word_count = word_count
                        except:
                            continue
                    
                    if best_word_count > 0:
                        return {
                            'text': best_text,
                            'bounding_boxes': [],
                            'word_count': best_word_count,
                            'pages_processed': 1
                        }
                
                except Exception as e:
                    logger.error(f"Tesseract failed: {e}")
            
            return {'text': 'No OCR engine available', 'bounding_boxes': [], 'word_count': 0}
            
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return {'text': f'Image error: {str(e)}', 'bounding_boxes': [], 'word_count': 0}

    def _process_pdf(self, file_path: str) -> Dict:
        full_text = []
        all_bounding_boxes = []
        total_words = 0
        
        try:
            doc = fitz.open(file_path)
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                
                page_text = page.get_text()
                
                if page_text.strip() and len(page_text.split()) > 3:
                    full_text.append(f"\n=== PAGE {page_num + 1} ===\n")
                    full_text.append(page_text)
                    total_words += len(page_text.split())
                else:
                    try:
                        mat = fitz.Matrix(2.0, 2.0)
                        pix = page.get_pixmap(matrix=mat, alpha=False)
                        img_data = pix.tobytes("png")
                        
                        pil_image = Image.open(io.BytesIO(img_data))
                        image_array = np.array(pil_image)
                        
                        if self.reader:
                            try:
                                results = self.reader.readtext(image_array, detail=1)
                                if results:
                                    text_parts = []
                                    for result in results:
                                        if len(result) >= 3 and result[2] > 0.3:
                                            text_parts.append(result[1].strip())
                                    
                                    if text_parts:
                                        ocr_text = ' '.join(text_parts)
                                        full_text.append(f"\n=== PAGE {page_num + 1} ===\n")
                                        full_text.append(ocr_text)
                                        total_words += len(ocr_text.split())
                            except:
                                pass
                        
                        elif self.tesseract_available:
                            try:
                                import pytesseract
                                text = pytesseract.image_to_string(image_array, config=r'--oem 3 --psm 6')
                                if text.strip():
                                    full_text.append(f"\n=== PAGE {page_num + 1} ===\n")
                                    full_text.append(text.strip())
                                    total_words += len(text.split())
                            except:
                                pass
                    
                    except Exception as e:
                        logger.error(f"Page {page_num + 1} OCR failed: {e}")

            doc.close()
            
            final_text = ''.join(full_text)
            
            return {
                'text': final_text,
                'bounding_boxes': all_bounding_boxes,
                'word_count': total_words,
                'pages_processed': len(doc)
            }
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            return {'text': f'PDF error: {str(e)}', 'bounding_boxes': [], 'word_count': 0}

    def extract_layout_elements(self, file_path: str) -> Dict:
        try:
            result = self.process_document(file_path)
            text = result.get('text', '')
            
            if not text:
                return {'headers': [], 'paragraphs': [], 'lists': [], 'tables': []}
            
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            headers = []
            paragraphs = []
            lists = []
            
            for line in lines:
                if len(line) < 80 and (line.isupper() or line.istitle()):
                    headers.append(line)
                elif line.startswith(('•', '-', '*', '1.', '2.', '3.')):
                    lists.append(line)
                elif len(line) > 20:
                    paragraphs.append(line)
            
            return {
                'headers': headers[:10],
                'paragraphs': paragraphs[:20],
                'lists': lists[:15],
                'tables': []
            }
            
        except Exception as e:
            logger.error(f"Layout extraction failed: {e}")
            return {'headers': [], 'paragraphs': [], 'lists': [], 'tables': []}
