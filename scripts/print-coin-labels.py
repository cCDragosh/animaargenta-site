#!/usr/bin/env python3
"""Fichas fisicas con QR vectorial; tamanos adaptados a bustine doppie.

Uso: python print-coin-labels.py labels.json fichas.pdf [--pocket auto|30|38|45|52|55]
El PDF es un borrador: verificar la URL publica y el escaneo antes de usar la funda.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

POCKET_TO_LABEL = {30: 28, 38: 36, 45: 43, 52: 47, 55: 53}
INK = HexColor('#17252A')
LINE = HexColor('#ACB3B2')


def pocket_for(coin):
    diameter = (coin.get('measurements') or {}).get('diameter_mm')
    if not isinstance(diameter, (int, float)) or not 0 < diameter <= 50:
        return 52
    if diameter <= 25: return 30
    if diameter <= 33: return 38
    if diameter <= 40: return 45
    return 55


def fitted(pdf, text, x, y, width, font='Helvetica', size=6.4, min_size=4.4):
    value = str(text or '')
    while size > min_size and pdf.stringWidth(value, font, size) > width:
        size -= .25
    if pdf.stringWidth(value, font, size) > width:
        while value and pdf.stringWidth(value + '...', font, size) > width:
            value = value[:-1]
        value += '...'
    pdf.setFont(font, size)
    pdf.drawString(x, y, value)


def qr_at(pdf, content, x, y, side):
    pdf.saveState()
    qr = QrCodeWidget(content, barLevel='M')
    bounds = qr.getBounds()
    n = max(bounds[2] - bounds[0], bounds[3] - bounds[1])
    pdf.setFillColorRGB(1, 1, 1)
    pdf.rect(x - .6*mm, y - .6*mm, side + 1.2*mm, side + 1.2*mm, stroke=0, fill=1)
    drawing = Drawing(side, side, transform=[side/n, 0, 0, side/n, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, x, y)
    pdf.restoreState()


def card(pdf, x, y, item, side_mm):
    side = side_mm * mm
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(.32)
    pdf.roundRect(x, y, side, side, 1.3*mm, stroke=1, fill=0)
    pdf.setFillColor(INK)
    if side_mm == 28:
        # Formato para dime/cent: ID y QR, sin microtexto ilegible.
        fitted(pdf, 'ANIMA ARGENTA', x+2*mm, y+side-3.7*mm, side-4*mm,
               'Helvetica-Bold', 4.6, 4.2)
        fitted(pdf, item['id'], x+2*mm, y+side-8.2*mm, side-4*mm,
               'Helvetica-Bold', 7.8, 6.8)
        qr_at(pdf, item['url'], x+(side-16*mm)/2, y+1.2*mm, 16*mm)
        return
    if side_mm == 36:
        fitted(pdf, 'ANIMA ARGENTA', x+2.5*mm, y+side-4.1*mm, side-5*mm,
               'Helvetica-Bold', 5.4, 4.8)
        fitted(pdf, item['id'], x+2.5*mm, y+side-9*mm, side-5*mm,
               'Helvetica-Bold', 9.0, 7.7)
        fitted(pdf, item['subtitle'], x+2.5*mm, y+side-13.3*mm, side-5*mm,
               'Helvetica', 6.2, 4.7)
        qr_at(pdf, item['url'], x+(side-18*mm)/2, y+1.4*mm, 18*mm)
        return
    # Para formatos 45 / 52 / 55: ficha ampliada y QR estable.
    left = x + 3*mm
    fitted(pdf, 'ANIMA ARGENTA', left, y+side-5*mm, side-6*mm,
           'Helvetica-Bold', 6.5)
    fitted(pdf, item['id'], left, y+side-11.8*mm, side-6*mm,
           'Helvetica-Bold', 10.5, 8.5)
    pdf.setStrokeColor(LINE)
    pdf.line(left, y+side-14*mm, x+side-3*mm, y+side-14*mm)
    fitted(pdf, item['title'], left, y+side-18*mm, side-6*mm)
    fitted(pdf, item['subtitle'], left, y+side-22.3*mm, side-6*mm, size=6.2)
    qr_side = 18*mm if side_mm <= 47 else 20*mm
    qr_bottom = 2.6*mm
    qr_x = x+side-qr_side-3*mm
    qr_at(pdf, item['url'], qr_x, y+qr_bottom, qr_side)
    left_width = qr_x-left-1.6*mm
    fitted(pdf, item.get('metal') or 'Metal por confirmar', left, y+side-26.7*mm,
           left_width, size=6.2, min_size=4.4)
    measures = item.get('measurements') or {}
    if measures.get('weight_g') is not None:
        fitted(pdf, str(measures['weight_g'])+' g', left, y+11*mm,
               left_width, size=6.2)
    if measures.get('diameter_mm') is not None:
        fitted(pdf, str(measures['diameter_mm'])+' mm', left, y+7.4*mm,
               left_width, size=6.2)
    fitted(pdf, 'ID + QR', left, y+3.6*mm, left_width,
           size=5.0, min_size=4.4)


def generate_page(pdf, items, pocket, page_num):
    pagew, pageh = A4
    size_mm = POCKET_TO_LABEL[pocket]
    side = size_mm * mm
    cols = min(7, int((pagew - 20*mm)//side))
    rows = int((pageh - 33*mm)//side)
    cap = cols * rows
    startx = (pagew - cols*side)/2
    top = pageh - 20*mm
    pdf.setFillColor(INK)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(12*mm, pageh - 12*mm, 'ANIMA ARGENTA   |   ETIQUETAS QR')
    pdf.setFont('Helvetica', 7)
    pdf.drawRightString(pagew - 12*mm, pageh - 12*mm,
                        f'Funda {pocket} x {pocket} mm  /  Tarjeta {size_mm} x {size_mm} mm  /  Hoja {page_num}')
    for i, coin in enumerate(items[:cap]):
        x = startx + (i%cols)*side
        y = top - (i//cols+1)*side
        card(pdf, x, y, coin, size_mm)
    pdf.setFont('Helvetica', 7)
    pdf.setFillColor(HexColor('#616C72'))
    pdf.drawString(12*mm, 8*mm, 'Imprimir al 100%, sin ajustar. Comprobar QR y medidas antes de usar.')
    pdf.showPage()
    return cap


def main():
    parser = argparse.ArgumentParser(description='Fichas QR fisicas en varios tamanos')
    parser.add_argument('labels_json')
    parser.add_argument('output_pdf')
    parser.add_argument('--pocket', default='auto', choices=['auto','30','38','45','52','55'],
                        help='Tamano del bolsillo util (mm); auto usa diametro medido')
    args = parser.parse_args()
    records = json.loads(Path(args.labels_json).read_text(encoding='utf8'))
    if not isinstance(records,list) or not records:
        parser.error('Sin registros: no se crea PDF')
    grouped = defaultdict(list)
    for coin in records:
        if not all(isinstance(coin.get(k),str) and coin[k] for k in ('id','url','title','subtitle')):
            parser.error('Registro sin ID, URL, titulo o descripcion')
        if not coin['url'].startswith('https://animaargenta.com/aa/'+coin['id']+'/'):
            parser.error('El QR debe apuntar al ID exacto')
        p = pocket_for(coin) if args.pocket == 'auto' else int(args.pocket)
        grouped[p].append(coin)
    target = Path(args.output_pdf)
    target.parent.mkdir(parents=True,exist_ok=True)
    pdf = canvas.Canvas(str(target),pagesize=A4)
    pdf.setTitle('AnimaArgenta - fichas QR por tamano')
    for p in sorted(grouped):
        batch = grouped[p]
        n = 0
        while batch:
            cap = generate_page(pdf,batch,p,n+1)
            batch = batch[cap:]
            n+=1
    pdf.save()
    print('Generadas',len(records),'fichas en formatos',', '.join(str(p)+'mm' for p in sorted(grouped)))


if __name__ == '__main__':
    main()
