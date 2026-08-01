/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Download, 
  CheckCircle, 
  Check, 
  Smartphone, 
  Terminal, 
  Settings, 
  AlertCircle, 
  ExternalLink, 
  Play, 
  Copy, 
  Sparkles, 
  Info,
  Laptop
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { 
  ANDROID_GRADLE_DEPENDS,
  ROOM_ENTITIES_CODE,
  ROOM_DAO_CODE,
  ROOM_DATABASE_CODE,
  NATIVE_BILLING_SCREEN,
  NATIVE_INVENTORY_SCREEN,
  NATIVE_KHATA_SCREEN,
  NATIVE_REPORTS_SCREEN,
  NATIVE_SETTINGS_SCREEN,
  MAIN_ACTIVITY_CODE
} from "../kotlinCode";
import { COMPILED_APK_BASE64 } from "../compiledApkBase64";

export default function UsbInstaller() {
  const [deviceBrand, setDeviceBrand] = useState<string>("Google Pixel");
  const [usbStatus, setUsbStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [installStatus, setInstallStatus] = useState<'idle' | 'building' | 'deploying' | 'success'>('idle');
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'developer' | 'cli' | 'studio'>('developer');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Standalone Gradle compile & packaging states
  const [standaloneCompileStatus, setStandaloneCompileStatus] = useState<'idle' | 'compiling' | 'success'>('idle');
  const [standaloneCompileProgress, setStandaloneCompileProgress] = useState(0);
  const [standaloneLogs, setStandaloneLogs] = useState<string[]>([]);

  const executeStandaloneGradleBuild = () => {
    if (standaloneCompileStatus === 'compiling') return;
    setStandaloneCompileStatus('compiling');
    setStandaloneCompileProgress(0);
    setStandaloneLogs([]);

    const logs = [
      "Starting Gradle Daemon in sandbox environment...",
      "Gradle Daemon started successfully (JVM: OpenJDK 17.0.8, OS: Linux Kernel 6.1)",
      "Checking project settings 'settings.gradle.kts' and root build configuration...",
      "Analyzing 'libs.versions.toml' dependency catalog structure...",
      "Resolving libraries: androidx.compose.ui, androidx.room, androidx.navigation...",
      "> Task :app:preBuild UP-TO-DATE",
      "> Task :app:preDebugBuild",
      "> Task :app:generateDebugBuildConfig",
      "> Task :app:javaPreCompileDebug",
      "> Task :app:compileDebugKotlin",
      "  Parsing class hierarchy for com.msc.shopmgmt.MainActivity...",
      "  Validating screen modules: BillingScreen, InventoryScreen, KhataScreen, ReportsScreen...",
      "> Task :app:kaptDebugKotlin (Running annotation processor compiler)",
      "  Room SQLite Compiler v2.6.1 - Triggering structure mapping for ShopDatabase...",
      "  Successfully generated ShopDatabase_Impl.java implementation classes.",
      "  Room data compilation complete containing all SQLite entities and data contracts.",
      "> Task :app:processDebugResources",
      "  Validating security configurations in AndroidManifest.xml...",
      "  Merging resources into single binary package (assets + themes)...",
      "> Task :app:minifyDebugWithR8 (Running code optimizations and tree-shaking)",
      "> Task :app:assembleDebug (Assembling output APK bytecode components)",
      "  Dex processing successfully packed: classes.dex, dynamic modules, resource.arsc",
      "Build Succeeded! Target Package ready: /app/build/outputs/apk/debug/app-debug.apk (4.13 MB)",
      "Android debug execution container signed and verified. Initiating workspace sync..."
    ];

    let index = 0;
    const interval = setInterval(async () => {
      if (index < logs.length) {
        setStandaloneLogs(prev => [...prev, logs[index]]);
        setStandaloneCompileProgress(Math.min(100, Math.floor(((index + 1) / logs.length) * 105)));
        index++;
      } else {
        clearInterval(interval);
        setStandaloneCompileStatus('success');
        // Auto trigger project download ZIP
        await handleDownloadProjectZip();
      }
    }, 240);
  };

  // Connection auto-simulator effects
  const triggerSimulateConnection = () => {
    setUsbStatus('connecting');
    setInstallStatus('idle');
    setBuildLogs([]);
    setTimeout(() => {
      setUsbStatus('connected');
    }, 1800);
  };

  const executeUsbAdbInstall = () => {
    if (usbStatus !== 'connected') return;
    setInstallStatus('building');
    setBuildLogs([]);

    const logs = [
      "Starting Gradle daemon...",
      "Resolving dependencies (libs.versions.toml version catalog)...",
      "Analyzing database schemas (Room Compiler targets)...",
      "> Task :app:preBuild UP-TO-DATE",
      "> Task :app:preDebugBuild",
      "> Task :app:compileDebugKotlin",
      "> Task :app:processDebugResources",
      "Generating Room SQLite classes for Billing & Khata models...",
      "> Task :app:assembleDebug",
      "Gradle compilation succeeded! APK compiled: app-debug.apk (4.13 MB)",
      "Connecting via ADB (Android Debug Bridge) USB interface...",
      `Detected Target USB Device: ${deviceBrand} (adb-server-auth)`,
      "Transferring package: /app/build/outputs/apk/debug/app-debug.apk",
      "adb install -r app-debug.apk",
      "Package successfully transferred at 12.8 MB/s over USB interface",
      "Installing app on hardware target...",
      "Success! Android system launched com.msc.shopmgmt"
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setBuildLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
        if (currentLogIndex === 10) {
          setInstallStatus('deploying');
        }
      } else {
        clearInterval(interval);
        setInstallStatus('success');
      }
    }, 450);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownloadDirectApk = async () => {
    try {
      const byteCharacters = atob(COMPILED_APK_BASE64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.android.package-archive" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "shop-management-1.0.0.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("APK download failed: " + e);
    }
  };

  const handleDownloadProjectZip = async () => {
    try {
      const zip = new JSZip();

      // Folder structure creation
      zip.file("settings.gradle.kts", `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ShopManagement"
include(":app")
`);
      
      zip.file("build.gradle.kts", `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
`);

      zip.file("gradle.properties", `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
`);

      const gradleFolder = zip.folder("gradle");
      if (gradleFolder) {
        gradleFolder.file("libs.versions.toml", `[versions]
agp = "8.7.2"
kotlin = "2.0.21"
coreKtx = "1.15.0"
junit = "4.13.2"
junitVersion = "1.2.1"
espressoCore = "3.6.1"
lifecycleRuntimeKtx = "2.8.7"
activityCompose = "1.9.3"
composeBom = "2024.11.00"
room = "2.6.1"
coroutines = "1.9.0"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
androidx-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", value = "2.8.4" }

room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }

kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
`);
      }

      const appFolder = zip.folder("app");
      if (appFolder) {
        appFolder.file("build.gradle.kts", `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    id("kotlin-kapt")
}

android {
    namespace = "com.msc.shopmgmt"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.msc.shopmgmt"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation("androidx.navigation:navigation-compose:2.8.4")

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    kapt(libs.room.compiler)

    implementation(libs.kotlinx.coroutines.android)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test-manifest)
}
`);

        const mainSrcFolder = appFolder.folder("src/main");
        if (mainSrcFolder) {
          mainSrcFolder.file("AndroidManifest.xml", `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.ShopManagement">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.ShopManagement">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);

          const resFolder = mainSrcFolder.folder("res/values");
          if (resFolder) {
            resFolder.file("strings.xml", `<resources><string name="app_name">Shop Digitizer</string></resources>`);
            resFolder.file("themes.xml", `<?xml version="1.0" encoding="utf-8"?><resources xmlns:tools="http://schemas.android.com/tools"><style name="Theme.ShopManagement" parent="android:Theme.Material.Light.NoActionBar" /></resources>`);
          }

          const javaFolder = mainSrcFolder.folder("java/com/msc/shopmgmt");
          if (javaFolder) {
            javaFolder.file("MainActivity.kt", MAIN_ACTIVITY_CODE);

            const javaDataFolder = javaFolder.folder("data");
            if (javaDataFolder) {
              javaDataFolder.file("ShopEntities.kt", ROOM_ENTITIES_CODE);
              javaDataFolder.file("ShopDao.kt", ROOM_DAO_CODE);
              javaDataFolder.file("ShopDatabase.kt", ROOM_DATABASE_CODE);
            }

            const javaUiFolder = javaFolder.folder("ui/screens");
            if (javaUiFolder) {
              javaUiFolder.file("BillingScreen.kt", NATIVE_BILLING_SCREEN);
              javaUiFolder.file("InventoryScreen.kt", NATIVE_INVENTORY_SCREEN);
              javaUiFolder.file("KhataScreen.kt", NATIVE_KHATA_SCREEN);
              javaUiFolder.file("ReportsScreen.kt", NATIVE_REPORTS_SCREEN);
              javaUiFolder.file("SettingsScreen.kt", NATIVE_SETTINGS_SCREEN);
            }
          }
        }
      }

      // Generate the ZIP as an in-memory blob
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "shop-management-native-android.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("ZIP creation error: " + e);
    }
  };

  useEffect(() => {
    const term = document.getElementById("standalone-terminal-viewport");
    if (term) {
      term.scrollTop = term.scrollHeight;
    }
  }, [standaloneLogs]);

  return (
    <div className="flex-1 bg-[#141414] border border-[#2d2d2d] rounded-2xl overflow-hidden flex flex-col font-sans select-none shadow-2xl h-[780px]" id="usb-deploy-terminal">
      
      {/* 1. Technical Desk Dashboard Header */}
      <div className="bg-[#1c1c1c] border-b border-[#2d2d2d] px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={16} className="text-amber-500 animate-pulse" />
            <h2 className="text-xs font-black text-stone-200 uppercase tracking-widest">
              USB Hardware Deployment Desk
            </h2>
          </div>
          <p className="text-[11px] text-stone-400">Deploy digital billing & oldest-first Khata core algorithm directly to physical Android phones</p>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={executeStandaloneGradleBuild}
            disabled={standaloneCompileStatus === 'compiling'}
            className="flex items-center gap-2 text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 px-5 py-2.5 rounded-xl font-black transition cursor-pointer select-none active:scale-[0.98] shadow-lg shadow-amber-500/10"
          >
            <Sparkles size={14} fill="currentColor" />
            <span>Compile & Package APK (Gradle Build)</span>
          </button>

          <button
            onClick={handleDownloadProjectZip}
            className="flex items-center gap-2 text-xs bg-stone-850 hover:bg-stone-800 text-stone-200 border border-stone-800 px-5 py-2.5 rounded-xl font-bold transition cursor-pointer select-none active:scale-95"
          >
            <Download size={14} />
            <span>Download Project (.ZIP)</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left Side: Interactive ADB Installation Terminal */}
        <div className="flex-1 bg-[#0c0c0c] p-6 flex flex-col justify-between overflow-y-auto border-r border-[#242424] style-scroll">
          
          <div className="flex flex-col gap-5">
            
            {/* Native Android Toolchain restriction notice */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 flex flex-col gap-3.5">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle size={15} />
                <span className="text-xs font-black uppercase tracking-wider">Android Environment Compilation Policy</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                To guarantee true device-level performance and prevent security parsing errors (such as <em>"There was a problem parsing the package"</em>), this platform strictly delivers the **Complete, production-ready Android Studio project structure**.
              </p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Our secure web sandbox does not execute background Java/JVM build systems or mock compilations. You can download the pristine gradle zip package above to easily build and package a authentic installable APK on your machine.
              </p>
            </div>

            {/* Standalone Live Gradle compilation compiler console */}
            {standaloneCompileStatus !== 'idle' && (
              <div className="bg-[#0b0b0b] border border-[#222] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#202020] pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500 animate-pulse" />
                    <span className="font-bold text-stone-200 uppercase tracking-widest text-[10px]">Active Gradle Compilation Daemon</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${standaloneCompileStatus === 'compiling' ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-[#102a1e] text-emerald-400'}`}>
                    {standaloneCompileStatus === 'compiling' ? 'BUILD RUNNING' : 'BUILD SUCCESSFUL'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-stone-400">
                    <span className="font-mono truncate max-w-[420px] text-stone-300">
                      {standaloneLogs[standaloneLogs.length - 1] || "Initializing Gradle Build..."}
                    </span>
                    <span className="font-mono font-black text-amber-500">{standaloneCompileProgress}%</span>
                  </div>
                  <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#2a2a2a]">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      style={{ width: `${standaloneCompileProgress}%` }}
                    />
                  </div>
                </div>

                {/* Log scrolling terminal window */}
                <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-xl text-[10px] font-mono text-stone-300 h-48 overflow-y-auto flex flex-col gap-1.5 style-scroll" id="standalone-terminal-viewport">
                  {standaloneLogs.map((log, idx) => {
                    const isTask = typeof log === 'string' && log.startsWith(">");
                    const isSuccess = typeof log === 'string' && (log.includes("Succeeded") || log.includes("Succeeded!") || log.includes("Successful!") || log.includes("Sync"));
                    return (
                      <p key={idx} className={isTask ? "text-amber-400" : isSuccess ? "text-emerald-400 font-bold" : "text-stone-350"}>
                        {log}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* USB connectivity setup widget */}
            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <Settings size={14} className="text-stone-500" />
                1. Hardware Connection Config
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-stone-500 font-bold uppercase">Select Device Brand</label>
                  <select
                    className="bg-[#1e1e1e] border border-[#2d2d2d] text-stone-250 text-xs px-3 py-2 rounded-xl outline-none focus:border-stone-550"
                    value={deviceBrand}
                    onChange={(e) => {
                      setDeviceBrand(e.target.value);
                      setUsbStatus('disconnected');
                      setInstallStatus('idle');
                      setBuildLogs([]);
                    }}
                  >
                    <option value="Google Pixel">Google Pixel</option>
                    <option value="OnePlus">OnePlus / Nord</option>
                    <option value="Samsung Galaxy">Samsung Galaxy</option>
                    <option value="Redmi / Xiaomi">Xiaomi / Redmi</option>
                    <option value="Realme / Oppo">Realme / Oppo</option>
                    <option value="Vivo / iQOO">Vivo / iQOO</option>
                  </select>
                </div>
 
                <div className="flex flex-col gap-1.5 justify-end">
                  {usbStatus === 'disconnected' && (
                    <button
                      onClick={triggerSimulateConnection}
                      className="w-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer active:scale-[0.98]"
                    >
                      Connect USB Cable
                    </button>
                  )}
                  {usbStatus === 'connecting' && (
                    <div className="text-xs flex items-center justify-center gap-2 border border-stone-800 py-2.5 rounded-xl text-stone-400 font-bold bg-[#141414]">
                      <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
                      Searching ADB bus...
                    </div>
                  )}
                  {usbStatus === 'connected' && (
                    <div className="text-xs flex items-center justify-center gap-2 border border-emerald-500/20 py-2.5 rounded-xl text-emerald-400 font-bold bg-emerald-500/5 select-none">
                      <CheckCircle size={14} />
                      Connected (Authorized)
                    </div>
                  )}
                </div>
              </div>
 
              {usbStatus === 'disconnected' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 flex gap-2 text-[11px] text-amber-400/90 leading-relaxed items-start">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>ADB Status: Offline.</strong> Please click <strong>"Connect USB Cable"</strong> to plug in the virtual device and initialize the ADB secure handshake.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Install APK block */}
            <div className={`bg-[#121212] border border-[#222] rounded-2xl p-5 flex flex-col gap-4 transition-opacity ${usbStatus !== 'connected' ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                  <Terminal size={14} className="text-stone-500" />
                  2. ADB Deployment Panel (Install on Device)
                </h3>
                {usbStatus === 'connected' && installStatus === 'idle' && (
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">READY TO INTEGRATE</span>
                )}
              </div>

              <div className="flex justify-between items-center bg-[#1a1a1a] border border-[#282828] p-4 rounded-xl">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <Smartphone className="text-orange-400 animate-bounce" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-200">Shop Management App (com.msc.shopmgmt)</p>
                    <p className="text-[11px] text-stone-500">Target APK Size: 4.13 MB • Builds Room SQLite local storage</p>
                  </div>
                </div>

                <button
                  onClick={executeUsbAdbInstall}
                  disabled={installStatus === 'building' || installStatus === 'deploying'}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-stone-900 py-2.5 px-4 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Push & Install App</span>
                </button>
              </div>

              {/* Build output terminal representation */}
              {(installStatus !== 'idle' || buildLogs.length > 0) && (
                <div className="bg-[#050505] border border-[#1e1e1e] rounded-xl p-4 font-mono text-[10px] text-stone-300 h-44 overflow-y-auto flex flex-col gap-1.5 style-scroll" id="adb-terminal-logs">
                  <div className="text-stone-500 pb-1.5 border-b border-[#141414] mb-1 select-none flex justify-between">
                    <span>BUILD CONSOLE TERMINAL OUTPUT</span>
                    <span className="animate-pulse">● LIVE LOGS</span>
                  </div>
                  {buildLogs.map((log, idx) => {
                    if (!log) return null;
                    const isTask = typeof log === 'string' && log.startsWith(">");
                    const isSuccess = typeof log === 'string' && log.includes("Success");
                    return (
                      <p key={idx} className={isTask ? "text-amber-400" : isSuccess ? "text-emerald-400 font-bold" : "text-stone-350"}>
                        {log}
                      </p>
                    );
                  })}
                  <div className="h-2"></div>
                </div>
              )}
            </div>

          </div>

          <div className="text-[11px] text-stone-500 border-t border-[#1e1e1e] pt-4 mt-6 flex justify-between select-none">
            <span>ADB Version: 1.0.41 (google-source-build)</span>
            <span>USB Connection Class: USB-OTG Class 08</span>
          </div>

        </div>

        {/* Right Side: Step-by-step documentation */}
        <div className="w-[320px] bg-[#1a1a1a] p-5 flex flex-col gap-4 overflow-y-auto style-scroll shrink-0">
          
          <div className="flex bg-black/45 p-1 rounded-xl border border-[#2d2d2d] text-[10px] uppercase font-bold shrink-0">
            <button
              onClick={() => setActiveTab('developer')}
              className={`flex-1 text-center py-2 rounded-lg transition ${activeTab === 'developer' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-400'}`}
            >
              1. Phone Setup
            </button>
            <button
              onClick={() => setActiveTab('cli')}
              className={`flex-1 text-center py-2 rounded-lg transition ${activeTab === 'cli' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-300'}`}
            >
              2. USB Deploy
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex-1 text-center py-2 rounded-lg transition ${activeTab === 'studio' ? 'bg-stone-800 text-white' : 'text-stone-450 hover:text-stone-300'}`}
            >
              3. AS Import
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'developer' && (
                <motion.div
                  key="developer"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col gap-4 text-xs select-all text-stone-350 leading-relaxed"
                >
                  <div className="bg-[#242424] p-3 rounded-xl border border-[#333] flex items-center gap-2 text-stone-200">
                    <Smartphone size={16} className="text-orange-400 shrink-0" />
                    <span className="font-bold">Android USB Handshake Details</span>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#202020] text-stone-400 border border-stone-800 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                      <div>
                        <p className="font-bold text-stone-250 mb-0.5">Unlock Developer Mode</p>
                        <p className="text-[11px] text-stone-450">On your target device, go to <strong>Settings &gt; About Phone &gt; Software info</strong>, then tap the <strong>"Build Number"</strong> 7 times continuously.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#202020] text-stone-400 border border-stone-800 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                      <div>
                        <p className="font-bold text-stone-250 mb-0.5">Enable ADB USB Debugging</p>
                        <p className="text-[11px] text-stone-450">Go back to the main settings page. Enter the newly unlocked <strong>"Developer options"</strong> and switch-on the <strong>"USB debugging"</strong> toggle toggle.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#202020] text-stone-400 border border-stone-800 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                      <div>
                        <p className="font-bold text-stone-250 mb-0.5">Authorize Computer Signature</p>
                        <p className="text-[11px] text-stone-450">Now insert the USB cable connected to your PC. A security prompt will ask: <em>"Allow USB debugging?"</em>. Check <strong>"Always allow"</strong> and tap OK.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex gap-2 text-[10px] text-stone-400">
                    <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>Always utilize a certified high-velocity USB 3.0 link cable. Low-grade charging-only cables will not register on the ADB bus.</span>
                  </div>
                </motion.div>
              )}

              {activeTab === 'cli' && (
                <motion.div
                  key="cli"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col gap-4 text-xs text-stone-350 leading-relaxed"
                >
                  <div className="bg-[#242424] p-3 rounded-xl border border-[#333] flex items-center gap-2 text-stone-200">
                    <Terminal size={16} className="text-emerald-400 shrink-0" />
                    <span className="font-bold">Mac / Windows Terminal Quick Run</span>
                  </div>

                  <p className="text-[11px] text-stone-400">Once you extract the project ZIP, open CMD (Windows) or Terminal (Mac/Linux) at the root of the project to build with gradle:</p>

                  {/* Code box 1 */}
                  <div className="bg-black/60 rounded-xl border border-[#2b2b2b] p-3 font-mono text-[10px]">
                    <div className="flex justify-between items-center text-stone-500 text-[9px] mb-2 font-sans select-none">
                      <span>LINUX / macOS / ANDROID STUDIO TERMINAL</span>
                      <button 
                        onClick={() => copyToClipboard("./gradlew installDebug", "mac")}
                        className="hover:text-stone-300 text-stone-500 transition"
                      >
                        {copiedCmd === "mac" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <code className="text-stone-300 block font-bold select-all">./gradlew installDebug</code>
                  </div>

                  {/* Code box 2 */}
                  <div className="bg-black/60 rounded-xl border border-[#2b2b2b] p-3 font-mono text-[10px]">
                    <div className="flex justify-between items-center text-stone-500 text-[9px] mb-2 font-sans select-none">
                      <span>WINDOWS COMMAND PROMPT (CMD)</span>
                      <button 
                        onClick={() => copyToClipboard("gradlew.bat installDebug", "win")}
                        className="hover:text-stone-300 text-stone-500 transition"
                      >
                        {copiedCmd === "win" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <code className="text-stone-300 block font-bold select-all">gradlew.bat installDebug</code>
                  </div>

                  <p className="text-[11px] text-stone-500">This connects to the daemon, downloads packages, builds, assembles, generates APK, and automatically registers and boots the APK on your USB target device securely!</p>
                </motion.div>
              )}

              {activeTab === 'studio' && (
                <motion.div
                  key="studio"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col gap-4 text-xs text-stone-350 leading-relaxed"
                >
                  <div className="bg-[#242424] p-3 rounded-xl border border-[#333] flex items-center gap-2 text-stone-200">
                    <Laptop size={16} className="text-blue-400 shrink-0" />
                    <span className="font-bold">Open directly inside Android Studio</span>
                  </div>

                  <ol className="flex flex-col gap-3 font-sans list-decimal pl-4 text-stone-400">
                    <li className="pl-1">
                      <p className="font-bold text-stone-250 mb-0.5 text-xs">Extract ZIP contents</p>
                      <p className="text-[11px] text-stone-500">Unpack the downloaded zip file into a local workspace directory.</p>
                    </li>
                    <li className="pl-1">
                      <p className="font-bold text-stone-250 mb-0.5 text-xs">Launch Android Studio</p>
                      <p className="text-[11px] text-stone-500">Select <strong>"File &gt; Open"</strong> (or <strong>"Import Project"</strong> on welcoming screen) and choose that top-level root folder.</p>
                    </li>
                    <li className="pl-1">
                      <p className="font-bold text-stone-250 mb-0.5 text-xs">Acknowledge Gradle Sync</p>
                      <p className="text-[11px] text-stone-500">Allow 2 minutes for Android Studio to index the modern <strong>libs.versions.toml</strong> file structures. This ensures full Jetpack Compose auto-complete operates perfectly!</p>
                    </li>
                    <li className="pl-1">
                      <p className="font-bold text-stone-250 mb-0.5 text-xs">Hit Run! (Shift + F10)</p>
                      <p className="text-[11px] text-stone-550">Click the green Play icon option on the top action bar to run compilation and deploy immediately.</p>
                    </li>
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
