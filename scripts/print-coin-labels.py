#!/usr/bin/env python3
"""Fichas fisicas 47 x 47 mm (20 por A4) con QR vectorial a URL permanente.

Uso: python scripts/print-coin-labels.py registry-preview/labels.json fichas.pdf
Dependencia: reportlab. Imprimir al 100%, sin ajustar a pagina.
Las URLs deben existir publicamente ANTES de usar las fichas.
"""
import json
import sys
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

SIDE = 47 * mm
COLOR = HexColor("#17252A")
BORDER = HexColor("#ACB3B2")

def card(pdf,x,y,item):
    pdf.setStrokeColor(BORDER)
    pdf.setLineWidth(.3)
    pdf.roundRect(x,y,SIDE,SIDE,1.5*mm,stroke=1,fill=0)
    left=x+3*mm
    pdf.setFillColor(COLOR)
    pdf.setFont('Helvetica-Bold',6.5)
    pdf.drawString(left,y+SIDE-5*mm,'ANIMA ARGENTA')
    pdf.setFont('Helvetica-Bold',10.5)
    pdf.drawString(left,y+SIDE-12*mm,item['id'])
    pdf.setStrokeColor(BORDER)
    pdf.line(left,y+SIDE-14*mm,x+SIDE-3*mm,y+SIDE-14*mm)
    lines=[item['title'],item['subtitle'],item.get('metal') or 'Metal pendiente']
    for j,t in enumerate(lines):
        t=str(t)
        while pdf.stringWidth(t,'Helvetica',6.3)>39*mm and len(t)>6:
            t=t[:-4]+'...'
        pdf.setFont('Helvetica',6.3)
        pdf.drawString(left,y+SIDE-(18+3.6*j)*mm,t)
    measures=item.get('measurements') or {}
    if measures.get('weight_g'):
        pdf.setFont('Helvetica',6)
        pdf.drawString(left,y+12*mm,str(measures['weight_g'])+' g')
    if measures.get('diameter_mm'):
        pdf.setFont('Helvetica',6)
        pdf.drawString(left,y+8*mm,str(measures['diameter_mm'])+' mm')
    pdf.setFont('Helvetica',5)
    pdf.drawString(left,y+4*mm,'ID + QR permanente')
    qr=QrCodeWidget(item['url'],barLevel='M')
    bounds=qr.getBounds()
    dimension=max(bounds[2]-bounds[0],bounds[3]-bounds[1])
    sz=18*mm
    drawing=Drawing(sz,sz,transform=[sz/dimension,0,0,sz/dimension,0,0])
    drawing.add(qr)
    renderPDF.draw(drawing,pdf,x+SIDE-22*mm,y+3*mm)

def main():
    if len(sys.argv)!=3:
        raise SystemExit('Uso: print-coin-labels.py labels.json salida.pdf')
    records=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
    if not isinstance(records,list) or not records:
        raise SystemExit('Sin fichas registradas: no se crea PDF.')
    target=Path(sys.argv[2])
    target.parent.mkdir(parents=True,exist_ok=True)
    pdf=canvas.Canvas(str(target),pagesize=A4)
    pdf.setTitle('AnimaArgenta - etiquetas QR 47mm')
    pagew,pageh=A4
    startx=(pagew-4*SIDE)/2
    starty=(pageh-5*SIDE)/2
    for index,coin in enumerate(records):
        pos=index%20
        if index and pos==0: pdf.showPage()
        x=startx+(pos%4)*SIDE
        y=pageh-starty-(pos//4+1)*SIDE
        card(pdf,x,y,coin)
    pdf.save()
    print('Generadas',len(records),'fichas; imprimir sin escalar.')

if __name__=='__main__':main()
