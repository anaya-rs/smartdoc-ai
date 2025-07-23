import os
import cv2
import numpy as np
import easyocr
from PIL import Image
import fitz
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCRProcessor:
    def __init__(self):
        logger.info("Initializing EasyOCR processor...")
        try:
            self.reader = easyocr.Reader(['en'], gpu=False)
            self.ocr_available = True
            logger.info("EasyOCR initialized successfully!")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {e}")
            self.reader = None
            self.ocr_available = False
        
        self.temp_dir = "temp_ocr"
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def preprocess_image(self, image):
        try:
            if hasattr(image, 'mode'):
                image = np.array(image)
            
            if len(image.shape) == 3 and image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            processed_images = []
            processed_images.append(("original", image))
            
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image.copy()
            
            processed_images.append(("grayscale", gray))
            
            enhanced = cv2.convertScaleAbs(gray, alpha=1.2, beta=10)
            processed_images.append(("enhanced", enhanced))
            
            blurred = cv2.GaussianBlur(gray, (1, 1), 0)
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            processed_images.append(("threshold", thresh))
            
            adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                             cv2.THRESH_BINARY, 11, 2)
            processed_images.append(("adaptive", adaptive))
            
            return processed_images
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return [("original", image)]
    
    def process_document(self, file_path):
        logger.info(f"Processing document: {file_path}")
        
        if not self.ocr_available:
            return {
                'text': 'EasyOCR not available. Please install easyocr package.',
                'confidence': 0,
                'word_count': 0,
                'bounding_boxes': []
            }
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return {'text': '', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
        
        file_ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if file_ext == '.pdf':
                return self._process_pdf(file_path)
            elif file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp']:
                return self._process_image(file_path)
            else:
                logger.warning(f"Unsupported file type: {file_ext}")
                return {'text': 'Unsupported file format', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            return {'text': f'Processing failed: {str(e)}', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
    
    def _process_pdf(self, file_path):
        logger.info(f"Processing PDF: {file_path}")
        all_text = []
        all_boxes = []
        total_confidence = 0
        page_count = 0
        
        try:
            pdf_document = fitz.open(file_path)
            
            for page_num in range(len(pdf_document)):
                page = pdf_document.load_page(page_num)
                extracted_text = page.get_text()
                
                if extracted_text.strip() and len(extracted_text.strip()) > 50:
                    all_text.append(f"Page {page_num + 1}:\n{extracted_text}")
                    total_confidence += 0.95
                    page_count += 1
                    logger.info(f"Page {page_num + 1}: Extracted {len(extracted_text)} characters (text-based)")
                    continue
                
                logger.info(f"Page {page_num + 1}: Using OCR (image-based)")
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_data = pix.tobytes("png")
                
                nparr = np.frombuffer(img_data, np.uint8)
                img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img_np is not None:
                    ocr_result = self._process_image_array(img_np, f"page_{page_num + 1}")
                    if ocr_result['text'].strip():
                        all_text.append(f"Page {page_num + 1}:\n{ocr_result['text']}")
                        all_boxes.extend(ocr_result['bounding_boxes'])
                        total_confidence += ocr_result['confidence']
                        page_count += 1
                        logger.info(f"Page {page_num + 1}: OCR extracted {len(ocr_result['text'])} characters")
            
            pdf_document.close()
            
            combined_text = '\n\n'.join(all_text)
            avg_confidence = (total_confidence / page_count) if page_count > 0 else 0
            word_count = len(combined_text.split()) if combined_text else 0
            
            logger.info(f"PDF processing complete: {word_count} words from {page_count} pages (avg confidence: {avg_confidence:.2f})")
            
            return {
                'text': combined_text,
                'confidence': avg_confidence,
                'word_count': word_count,
                'bounding_boxes': all_boxes,
                'pages_processed': page_count,
                'method': 'hybrid'
            }
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            return {'text': f'PDF processing failed: {str(e)}', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
    
    def _process_image(self, file_path):
        logger.info(f"Processing image: {file_path}")
        
        try:
            image = cv2.imread(file_path)
            if image is None:
                pil_image = Image.open(file_path)
                image = np.array(pil_image.convert('RGB'))
            
            return self._process_image_array(image, os.path.basename(file_path))
        except Exception as e:
            logger.error(f"Image loading failed: {e}")
            return {'text': f'Image loading failed: {str(e)}', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
    
    def _process_image_array(self, image, image_name="image"):
        if not self.ocr_available:
            return {'text': 'EasyOCR not available', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
        
        try:
            processed_images = self.preprocess_image(image)
            best_result = {'text': '', 'confidence': 0, 'bounding_boxes': []}
            
            for method_name, processed_img in processed_images:
                try:
                    logger.info(f"Trying OCR with method: {method_name}")
                    
                    if len(processed_img.shape) == 3:
                        ocr_image = processed_img
                    else:
                        ocr_image = cv2.cvtColor(processed_img, cv2.COLOR_GRAY2RGB)
                    
                    results = self.reader.readtext(ocr_image, detail=1, paragraph=False)
                    
                    texts = []
                    boxes = []
                    confidences = []
                    
                    for (bbox, text, confidence) in results:
                        if confidence > 0.3:
                            texts.append(text)
                            confidences.append(confidence)
                            x1 = min([point[0] for point in bbox])
                            y1 = min([point[1] for point in bbox])
                            x2 = max([point[0] for point in bbox])
                            y2 = max([point[1] for point in bbox])
                            
                            boxes.append({
                                'text': text,
                                'confidence': confidence * 100,
                                'bbox': [int(x1), int(y1), int(x2), int(y2)]
                            })
                    
                    combined_text = ' '.join(texts)
                    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                    
                    if len(combined_text.strip()) > len(best_result['text'].strip()):
                        best_result = {
                            'text': combined_text,
                            'confidence': avg_confidence,
                            'bounding_boxes': boxes,
                            'method': method_name
                        }
                        logger.info(f"Better result with {method_name}: {len(combined_text)} chars, confidence: {avg_confidence:.2f}")
                except Exception as method_error:
                    logger.warning(f"Method {method_name} failed: {method_error}")
                    continue
            
            word_count = len(best_result['text'].split()) if best_result['text'] else 0
            
            logger.info(f"{image_name} OCR complete: {word_count} words (confidence: {best_result['confidence']:.2f})")
            
            return {
                'text': best_result['text'],
                'confidence': best_result['confidence'],
                'word_count': word_count,
                'bounding_boxes': best_result['bounding_boxes'],
                'method_used': best_result.get('method', 'unknown')
            }
        except Exception as e:
            logger.error(f"EasyOCR processing failed: {e}")
            return {'text': f'OCR processing failed: {str(e)}', 'confidence': 0, 'word_count': 0, 'bounding_boxes': []}
    
    def extract_layout_elements(self, file_path):
        try:
            result = self.process_document(file_path)
            layout = {
                'text_blocks': [],
                'word_count': result.get('word_count', 0),
                'confidence': result.get('confidence', 0),
                'method': 'easyocr'
            }
            
            for box in result.get('bounding_boxes', []):
                layout['text_blocks'].append({
                    'text': box['text'],
                    'bbox': box['bbox'],
                    'confidence': box['confidence'],
                    'type': 'text'
                })
            
            return layout
        except Exception as e:
            logger.error(f"Layout extraction failed: {e}")
            return {
                'text_blocks': [],
                'word_count': 0,
                'confidence': 0,
                'method': 'easyocr',
                'error': str(e)
            }

    @property
    def tesseract_available(self):
        return self.ocr_available

    def get_supported_languages(self):
        if self.ocr_available:
            return self.reader.lang_list
        return []

    def add_language(self, lang_code):
        try:
            current_langs = self.reader.lang_list if self.ocr_available else ['en']
            if lang_code not in current_langs:
                new_langs = current_langs + [lang_code]
                self.reader = easyocr.Reader(new_langs, gpu=False)
                logger.info(f"Added language: {lang_code}")
                return True
        except Exception as e:
            logger.error(f"Failed to add language {lang_code}: {e}")
        return False
