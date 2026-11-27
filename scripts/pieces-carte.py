"""Découpe les planches de pièces des cartes (cartes/<carte>/pieces.png du dossier projet), égalise le trait et écrit des textures 512×512 dans public/cartes/<carte>/."""
import cv2, numpy as np, sys
from skimage.morphology import skeletonize
SRC='/mnt/project-files/cartes'; DST='public/cartes'
TRAIT=11; T=512; MARGE=24
NOMS={'piscine':['beignet','matelas','canard','bouee','douches','plongeoir','echelle','bord',None,None,'cabane','_cabane2'],
      'camp-scout':['hamac','tasDeBois','tyrolienne','feuDeCamp','echelleDeCorde','source','totem','cabane','_cabane2']}
def egaliser(im,alpha):
    rgb=im.astype(int)
    encre=((rgb.max(2)<100)&((rgb.max(2)-rgb.min(2))<45)&(alpha>128)).astype(np.uint8)
    sq=skeletonize(encre>0).astype(np.uint8)
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(TRAIT,TRAIT))
    neuve=cv2.dilate(sq,k)|encre
    im[neuve>0]=(25,25,25)
    plein=(alpha>128).astype(np.uint8)
    im[(plein-cv2.erode(plein,k))>0]=(25,25,25)
    return im
for carte,noms in NOMS.items():
    im=cv2.imread(f'{SRC}/{carte}/pieces.png'); h,w=im.shape[:2]
    m=np.zeros((h+2,w+2),np.uint8); fl=im.copy()
    for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]:
        cv2.floodFill(fl,m,p,(255,0,255),(14,)*3,(14,)*3,flags=4|cv2.FLOODFILL_FIXED_RANGE)
    fond=m[1:-1,1:-1]>0
    # le blanc enfermé entre deux pièces : remplissage depuis tous les points blancs touchant le fond
    alpha=np.where(fond,0,255).astype(np.uint8)
    # Trous blancs enfermés (bouées) : transparents aussi.
    blanc=(im.min(2)>235).astype(np.uint8)
    nb,lb,sb,_=cv2.connectedComponentsWithStats(blanc,connectivity=4)
    for j in range(1,nb):
        cy,cx=np.argwhere(lb==j).mean(0)
        if sb[j,4]>3000 and carte=='piscine' and cy<h/3 and (cx<w/4 or cx>3*w/4): alpha[lb==j]=0
    n,lab,st,cen=cv2.connectedComponentsWithStats(cv2.dilate(alpha,np.ones((5,5),np.uint8)))
    cols=4 if carte=='piscine' else 3
    cell=lambda i:int(cen[i,1]//(h/3))*cols+int(cen[i,0]//(w/cols))
    for c,nom in enumerate(noms):
        if not nom: continue
        ids=[i for i in range(1,n) if st[i,4]>300 and cell(i)==c]
        msk=np.isin(lab,ids)&(alpha>0)
        ys,xs=np.nonzero(msk); x,y=xs.min(),ys.min(); ww,hh=xs.max()+1-x,ys.max()+1-y
        sel=msk[y:y+hh,x:x+ww]
        piece=im[y:y+hh,x:x+ww].copy(); a=np.where(sel,255,0).astype(np.uint8)
        k=(T-2*MARGE)/max(ww,hh); tl=(round(ww*k),round(hh*k))
        piece=cv2.resize(piece,tl,interpolation=cv2.INTER_AREA); a=cv2.resize(a,tl,interpolation=cv2.INTER_AREA)
        piece=egaliser(piece,a)
        out=np.zeros((T,T,4),np.uint8); ox=(T-tl[0])//2; oy=(T-tl[1])//2
        out[oy:oy+tl[1],ox:ox+tl[0],:3]=piece; out[oy:oy+tl[1],ox:ox+tl[0],3]=np.where(a>128,255,0)
        cv2.imwrite(f'{DST}/{carte}/{nom}.png',out)
