import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import 'pdfjs-dist/legacy/build/pdf.worker.js';
import { Platform } from 'react-native';
import { parseItemizedReceiptText, parseReceiptText } from './receiptParser';
import type { ReceiptSuggestion } from './receiptParser';

export { parseItemizedReceiptText, parseReceiptText };
export type { ReceiptSuggestion };

const MAX_PDF_SIZE = 25 * 1024 * 1024;
const MAX_PDF_PAGES = 50;

export type ReceiptScanResult = {
  suggestions: ReceiptSuggestion[];
  itemized: boolean;
};

export async function scanReceipt(
  source: 'camera' | 'library' | 'pdf'
): Promise<ReceiptScanResult | null> {
  if (source === 'pdf') {
    return scanPdfReceipt();
  }

  if (Platform.OS === 'web') {
    throw new Error(
      'Photo receipt scanning uses on-device ML Kit and is only available on Android and iOS. On web, you can scan a selectable-text PDF or enter details manually.'
    );
  }

  let image: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Allow camera access to scan a receipt.');
    }
    image = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Allow photo access to choose a receipt image.');
    }
    image = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
  }

  if (image.canceled || !image.assets[0]) {
    return null;
  }
  const result = await TextRecognition.recognize(image.assets[0].uri);
  if (!result.text.trim()) {
    throw new Error('No text was found. Try a clearer, well-lit receipt.');
  }
  const items = parseItemizedReceiptText(result.text);
  return items.length > 0
    ? { suggestions: items, itemized: true }
    : { suggestions: [parseReceiptText(result.text)], itemized: false };
}

async function scanPdfReceipt(): Promise<ReceiptScanResult | null> {
  const selection = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });
  if (selection.canceled) {
    return null;
  }

  const file = selection.assets[0];
  if (file.size !== undefined && file.size > MAX_PDF_SIZE) {
    throw new Error('The selected PDF is larger than the 25 MB limit.');
  }

  let bytes: Uint8Array;
  if (Platform.OS === 'web') {
    if (!file.file) {
      throw new Error('The browser could not access the selected PDF. Please choose it again.');
    }
    bytes = new Uint8Array(await file.file.arrayBuffer());
  } else {
    bytes = await new File(file.uri).bytes();
  }

  // Do not execute generated font code while parsing a user-provided document.
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
  });

  try {
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error('The selected PDF has more than 50 pages. Choose a shorter receipt or invoice.');
    }

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : ''))
          .join('')
      );
      page.cleanup();
    }
    const text = pages.join('\n').trim();
    if (!text) {
      throw new Error(
        'This PDF has no selectable text. For a scanned receipt, choose a photo or take a picture instead.'
      );
    }
    const items = parseItemizedReceiptText(text);
    return items.length > 0
      ? { suggestions: items, itemized: true }
      : { suggestions: [parseReceiptText(text)], itemized: false };
  } finally {
    await loadingTask.destroy();
  }
}
