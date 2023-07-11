import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { ensureConnected } from "@/utils/bluetooth/js/main";
import { replRawMode, replSend } from "@/utils/bluetooth/js/repl";
import { Button, Select, Input, InputNumber } from "antd";
import { useWhisper } from "@chengsokdara/use-whisper";
import { app } from "@/utils/app";
import { execMonocle } from "@/utils/comms";

const inter = Inter({ subsets: ["latin"] });




const Home = () => {
  // Bestehende Zustände
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { startRecording, stopRecording, transcript } = useWhisper({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_TOKEN,
    streaming: true,
    timeSlice: 500,
    whisperConfig: {
    language: "de",
    },
  });
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_OPENAI_API_TOKEN);
  const [temperature, setTemperature] = useState(1.0);
  const [language, setLanguage] = useState("de");
  const [response, setResponse] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(''); // Neuer Zustand für systemPrompt
  const [question, setQuestion] = useState("");

  const setLanguagePrompt = (language) => {
    let systemPrompt;
    switch(language) {
      case "de":
        systemPrompt = "Du bist ein Sprachassistent und antwortest in Deutsch.";
        break;
      case "it":
        systemPrompt = "Sei un assistente linguistico e rispondi in Italiano.";
        break;
      case "en":
        systemPrompt = "You are a language assistant and answer in English.";
        break;
      default:
        systemPrompt = "You are a language assistant.";
    }
    setSystemPrompt(systemPrompt);
  }


const fetchGpt = async () => {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: question },
  ];

  const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: temperature,
      max_tokens: 2000,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("API request error:", response.status, message);
    throw new Error(`API request failed: ${message}`);
  }

  const resJson = await response.json();
  const res = resJson?.choices?.[0]?.message?.content;
  if (!res) return;
  setResponse(res);
  await displayRawRizz(res);
};

  useEffect(() => {
    // Sync the window variable and the transcript
    window.transcript = transcript.text;
  }, [transcript.text]);

	useEffect(() => {
	  setLanguagePrompt(language);
	}, [language]);


  return (
    <>
      <Head>
        <title>rizzGPT</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${inter.className} ${styles.main}`}>
		<div className="flex w-screen h-screen flex-col items-center justify-start">
          <p className="text-3xl mb-4">{connected ? "Connected" : "Disconnected"}</p>
          <div style={{ width: '50%' }}>

            <Input className="mb-2" style={{ height: '40px' }} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" />

			<InputNumber className="mb-2" style={{ width: '100%', height: '40px' }} min={0} max={2} step={0.1} value={temperature} onChange={(value) => setTemperature(value)} />
            <Select className="mb-2" style={{ width: '100%', height: '40px' }} value={language} onChange={(value) => {setLanguage(value); setLanguagePrompt(value, setSystemPrompt)}}>
              <Select.Option value="de">Deutsch</Select.Option>
              <Select.Option value="it">Italiano</Select.Option>
              <Select.Option value="en">English</Select.Option>
            </Select>

			<Input.TextArea className="mb-2" style={{ height: '100px' }} value={systemPrompt} placeholder="Define the role of GPT-3" onChange={(e) => setSystemPrompt(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }} />
			<Input.TextArea className="mb-2" style={{ height: '100px' }} placeholder="Ask a question" onChange={(e) => setQuestion(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }} />
            <Input.TextArea className="mb-2" style={{ height: '600px' }} readOnly value={response} autoSize={{ minRows: 2, maxRows: 10 }}/>
			<Button className="mb-2" type="primary" onClick={async () => {
              await ensureConnected(logger, relayCallback);
              app.run(execMonocle);
              await displayRawRizz();
            }}>
              Connect
            </Button>
            <Button className="mb-2" onClick={onRecord}>
              {isRecording ? "Stop recording" : "Start recording"}
            </Button>
            <Button className="mb-2" onClick={fetchGpt}>Get response</Button>
          </div>
          {transcript.text}
        </div>
      </main>
    </>
  );
  
  

  function relayCallback(msg) {
    if (!msg) {
      return;
    }
    if (msg.trim() === "trigger b") {
      // Left btn
      // fetchGpt();
    }

    if (msg.trim() === "trigger a") {
      // Right btn
      // onRecord();
    }
  }

  function onRecord() {
    isRecording ? stopRecording() : startRecording();
    setIsRecording(!isRecording);
  }

  function wrapText(inputText) {
    const block = 30;
    let text = [];
    for (let i = 0; i < 6; i++) {
      text.push(
        inputText.substring(block * i, block * (i + 1)).replace("\n", "")
      );
    }

    return text;
  }

  async function displayRizz(rizz) {
    if (!rizz) return;
    const splitText = wrapText(rizz);
    let replCmd = "import display;";

    for (let i = 0; i < splitText.length; i++) {
      replCmd += `display.text("${splitText[i]}", 0, ${i * 50}, 0xffffff);`;
    }

    replCmd += "display.show();";

    console.log("**** replCmd ****", replCmd);

    await replSend(replCmd);
  }

  async function displayRawRizz(rizz) {
    await replRawMode(true);
    await displayRizz(rizz);
  }

  async function logger(msg) {
    if (msg === "Connected") {
      setConnected(true);
    }
  }
}

export default Home;
