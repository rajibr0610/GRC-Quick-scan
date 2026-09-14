 "use client";

import { useEffect, useState } from "react";

export default function CheckoutComplete() {
  const [message, setMessage] = useState("Payment received. Your report is being unlocked…");

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    if (status === "error") {
      setMessage("Payment was not completed. You can return to the assessment and try again.");
    } else {
      setMessage("Payment received. Return to your assessment page to access the paid report.");
    }
  }, []);

  return (
    <main style={{maxWidth:700,margin:"80px auto",padding:24,fontFamily:"system-ui"}}>
      <h1>GRC QuickScan</h1>
      <h2>{message}</h2>
      <p>For security, the server confirms payment through the Whop payment webhook before unlocking a report.</p>
      <a href="/" style={{display:"inline-block",marginTop:20,padding:"12px 16px",background:"#111827",color:"#fff",borderRadius:8,textDecoration:"none"}}>Back to QuickScan</a>
    </main>
  );
}
