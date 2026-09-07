'use client';
import {useState} from 'react';
export default function PrintButton(){const [error,setError]=useState('');return <><button onClick={async()=>{setError('');const imgs=Array.from(document.querySelectorAll<HTMLImageElement>('.invoice-logo'));try{await Promise.all(imgs.map(img=>img.decode()));window.print()}catch{setError('Logo konnte nicht geladen werden. Bitte Seite erneut laden.')}}}>Drucken / als PDF speichern</button>{error&&<p role="alert">{error}</p>}</>}
