// packages/export/src/converter/data.ts
var weaponTypes = [
  "AR",
  "Bow",
  "Fusion",
  "GL",
  "Glaive",
  "HC",
  "Heavy GL",
  "LFR",
  "LMG",
  "Pulse",
  "Rocket",
  "Scout",
  "Shotgun",
  "Sidearm",
  "SMG",
  "Sniper",
  "Sword",
  "Trace",
  // ---------
  "Grenade",
  "Melee",
  "Super"
];
var languages = [
  ["en", "English"],
  ["de", "German - Deutsch"],
  ["fr", "French - Fran\xE7ais"],
  ["it", "Italian - Italiano"],
  ["pl", "Polish - Polski"],
  ["ru", "Russian - \u0420\u0443\u0441\u0441\u043A\u0438\u0439"],
  ["es", "Spanish (Spain) - Espa\xF1ol (Espa\xF1a)"],
  ["es-mx", "Spanish (Mexico) - Espa\xF1ol (M\xE9xico)"],
  ["ko", "Korean - \uD55C\uAD6D\uC5B4"],
  ["pt-br", "Portuguese (Brazil) - Portugu\xEAs (Brasil)"],
  ["ja", "Japanese - \u65E5\u672C\u8A9E"],
  ["zh-cht", "Chinese (Traditional) - \u7E41\u9AD4\u4E2D\u6587"],
  ["zh-chs", "Chinese (Simplified) - \u7B80\u4F53\u4E2D\u6587"]
];
var languageKeys = languages.map((languageKey) => languageKey[0]);
var textColoring = [
  "blue",
  "green",
  "purple",
  "yellow",
  "center",
  "bold",
  "pve",
  "pvp"
];
var images = [
  "kinetic",
  "arc",
  "solar",
  "stasis",
  "void",
  "strand",
  "heavy",
  "primary",
  "special",
  "barrier",
  "overload",
  "unstoppable",
  "hunter",
  "titan",
  "warlock"
];
var table = [
  "background_1",
  "background_2",
  "centerTable",
  "formula",
  "wide"
];
var empty = ["background", "breakSpaces", "bold"];
var classNameList = {
  line: [...textColoring, ...empty],
  withText: [...textColoring, "background", "bold"],
  empty: [...images, ...empty],
  withExtraFunctionality: ["link", "title", "formula"],
  extra: ["enhancedArrow", "spacer"],
  table
};
var allClassNames = Object.values(classNameList).flat();

// packages/export/src/converter/converterSettings.ts
var converterSettings = {
  clarity: {
    getFromPerk: {
      lastUpload: true,
      stats: true,
      type: true,
      uploadedBy: true,
      updateTracker: false,
      associated: false,
      languages: void 0
    },
    getFromDescription: {
      formula: true,
      link: true,
      title: true,
      table: true,
      includeClassNames: void 0,
      excludeClassNames: []
    },
    enhancedArrowReplacement: void 0,
    aliases: "legacy",
    editor: "main",
    optional: false
  },
  dim: {
    getFromPerk: {
      lastUpload: false,
      stats: false,
      type: false,
      uploadedBy: false,
      updateTracker: false,
      associated: false,
      languages: void 0
    },
    getFromDescription: {
      formula: false,
      link: true,
      title: false,
      table: false,
      includeClassNames: ["spacer", "center", "bold", "breakSpaces", "background", "enhancedArrow", ...images],
      excludeClassNames: []
    },
    enhancedArrowReplacement: "",
    aliases: "legacy",
    editor: "secondary",
    optional: false
  },
  crayon: {
    getFromPerk: {
      lastUpload: true,
      stats: true,
      type: true,
      uploadedBy: true,
      updateTracker: false,
      associated: false,
      languages: void 0
    },
    getFromDescription: {
      formula: false,
      link: true,
      title: false,
      table: false,
      includeClassNames: [
        "spacer",
        "stasis",
        "arc",
        "solar",
        "void",
        "primary",
        "special",
        "heavy",
        "pve",
        "pvp",
        "background",
        "bold"
      ],
      excludeClassNames: []
    },
    enhancedArrowReplacement: void 0,
    aliases: "legacy",
    editor: "secondary",
    optional: true,
    toStringConverterOptions: {
      classNames: {
        stasis: ["<:stasis:915198000727461909>", ""],
        arc: ["<:arc:720178925317128243>", ""],
        solar: ["<:solar:720178909361995786>", ""],
        void: ["<:void:720178940240461864>", ""],
        primary: ["<:primary:968793055677251604>", ""],
        special: ["<:special:968793055631114330>", ""],
        heavy: ["<:heavy:968793055652106320>", ""],
        pve: ["<:pve:922884406073507930>", ""],
        pvp: ["<:pvp:922884468275019856>", ""],
        background: ["**", "**"],
        bold: ["**", "**"]
      },
      link: ["[", "]", "(", ")"]
    }
  },
  foundry: {
    getFromPerk: {
      lastUpload: true,
      stats: false,
      type: true,
      uploadedBy: true,
      updateTracker: true,
      associated: false,
      languages: void 0
    },
    getFromDescription: {
      formula: false,
      link: false,
      title: false,
      table: false,
      includeClassNames: ["spacer", "breakSpaces", "enhancedArrow", ...images],
      excludeClassNames: []
    },
    enhancedArrowReplacement: void 0,
    aliases: "legacy",
    editor: "secondary",
    optional: false
  },
  lightGG: {
    getFromPerk: {
      lastUpload: true,
      stats: false,
      type: false,
      uploadedBy: false,
      updateTracker: true,
      associated: false,
      languages: void 0
    },
    getFromDescription: {
      formula: false,
      link: true,
      title: false,
      table: false,
      includeClassNames: ["spacer", "center", "bold", "breakSpaces", "background", "enhancedArrow"],
      excludeClassNames: []
    },
    enhancedArrowReplacement: void 0,
    aliases: "legacy",
    editor: "secondary",
    optional: false
  },
  braytech: {
    getFromPerk: {
      lastUpload: true,
      stats: true,
      type: true,
      uploadedBy: true,
      updateTracker: false,
      associated: false,
      languages: void 0
    },
    getFromDescription: {
      formula: false,
      link: true,
      title: false,
      table: false,
      includeClassNames: [
        "solar",
        "void",
        "arc",
        "stasis",
        "strand",
        "primary",
        "special",
        "heavy",
        "pve",
        "pvp",
        "background",
        "spacer",
        "bold"
      ],
      excludeClassNames: []
    },
    enhancedArrowReplacement: void 0,
    aliases: "legacy",
    editor: "main",
    // copied from clarity but crayon used secondary ???
    optional: false,
    // same as above
    toStringConverterOptions: {
      classNames: {
        solar: ["\uE140", ""],
        void: ["\uE144", ""],
        arc: ["\uE143", ""],
        stasis: ["\uE139", ""],
        strand: ["\uEF0E", ""],
        primary: ["\uF106", ""],
        special: ["\uF107", ""],
        heavy: ["\uF108", ""],
        titan: ["\uF110", ""],
        hunter: ["\uF111", ""],
        warlock: ["\uF112", ""],
        bold: ["**", "**"]
      },
      link: ["[", "]", "(", ")"]
    }
  },
  vaultZero: {
    getFromPerk: {
      lastUpload: false,
      stats: true,
      type: true,
      uploadedBy: false,
      updateTracker: false,
      associated: false,
      languages: ["en"]
    },
    getFromDescription: {
      formula: false,
      link: true,
      title: false,
      table: false,
      includeClassNames: [
        "enhancedArrow",
        "arc",
        "solar",
        "stasis",
        "strand",
        "void",
        "primary",
        "special",
        "heavy",
        "barrier",
        "overload",
        "unstoppable",
        "pve",
        "pvp",
        "bold"
      ],
      excludeClassNames: []
    },
    enhancedArrowReplacement: "[enh]",
    aliases: "legacy",
    editor: "secondary",
    optional: true,
    toStringConverterOptions: {
      classNames: {
        arc: ["[Arc]", ""],
        solar: ["[Solar]", ""],
        stasis: ["[Stasis]", ""],
        strand: ["[Strand]", ""],
        void: ["[Void]", ""],
        primary: ["[primary]", ""],
        special: ["[special]", ""],
        heavy: ["[heavy]", ""],
        barrier: ["[barrier]", ""],
        overload: ["[overload]", ""],
        unstoppable: ["[unstoppable]", ""],
        pve: ["[pve]", ""],
        pvp: ["[pvp]", ""],
        bold: ["**", "**"]
      },
      link: ["[", "]", "(", ")"]
    }
  },
  // Output of the v2 editor: same as clarity, plus associations; stats are dropped because v2 data is stat-free
  clarityV2: {
    getFromPerk: {
      lastUpload: true,
      stats: false,
      type: true,
      uploadedBy: true,
      updateTracker: false,
      associated: true,
      languages: void 0
    },
    getFromDescription: {
      formula: true,
      link: true,
      title: true,
      table: true,
      includeClassNames: void 0,
      excludeClassNames: []
    },
    enhancedArrowReplacement: void 0,
    aliases: "reference",
    editor: "main",
    optional: false
  }
};
var getSettings = (name) => {
  const settings = converterSettings[name];
  const includedClassNames = settings.getFromDescription.includeClassNames || allClassNames;
  return {
    ...settings,
    getFromPerk: {
      ...settings.getFromPerk,
      languages: settings.getFromPerk.languages === void 0 ? languageKeys : settings.getFromPerk.languages
    },
    getFromDescription: {
      ...settings.getFromDescription,
      includeClassNames: includedClassNames.filter(
        (className) => !settings.getFromDescription.excludeClassNames.includes(className)
      )
    }
  };
};

// packages/export/src/converter/converterFunctions/expandAliases.ts
var factNames = ["name", "type", "itemHash", "itemName"];
var isAliasStub = (perk) => "aliasOf" in perk;
var expandAliases = (perks) => {
  const expanded = {};
  for (const [hash, perk] of Object.entries(perks)) {
    if (!isAliasStub(perk)) {
      expanded[hash] = perk;
      continue;
    }
    const original = perks[perk.aliasOf];
    if (!original || isAliasStub(original)) continue;
    const copy = { ...original, hash: perk.hash };
    const facts = factNames.filter((fact) => perk[fact] !== void 0);
    if (facts.length > 0) {
      for (const fact of factNames) delete copy[fact];
      Object.assign(copy, ...facts.map((fact) => ({ [fact]: perk[fact] })));
    }
    expanded[hash] = copy;
  }
  return expanded;
};
var getAliasOutput = (settings, stub) => {
  if (settings.aliases === "reference") return "reference";
  return stub.aliasKind === "frame" ? "copy" : "skip";
};

// packages/export/src/converter/converterFunctions/validateReferences.ts
var validateReferences = (database) => {
  for (const hash of [1, 2, 3]) {
    const perk = database[hash];
    if (!perk || isAliasStub(perk)) throw new Error(`Missing canonical reserved global ${hash}`);
  }
  for (const [hash, perk] of Object.entries(database)) {
    if (isAliasStub(perk)) {
      const target = database[perk.aliasOf];
      if (!target || isAliasStub(target)) {
        throw new Error(`Invalid alias ${hash} -> ${perk.aliasOf}: target must be an existing canonical perk`);
      }
      continue;
    }
    for (const associated of perk.associated || []) {
      const target = database[associated];
      if (!target || isAliasStub(target) || associated === perk.hash) {
        throw new Error(`Invalid association ${hash} -> ${associated}: target must be another existing canonical perk`);
      }
    }
  }
};
var validateOutputReferences = (database) => {
  for (const [hash, perk] of Object.entries(database)) {
    const targets = "aliasOf" in perk ? [perk.aliasOf] : perk.associated || [];
    for (const targetHash of targets) {
      const target = database[targetHash];
      if (!target || "aliasOf" in target || !target.descriptions) {
        throw new Error(`Invalid output reference ${hash} -> ${targetHash}: canonical target was filtered out`);
      }
    }
  }
};

// packages/export/src/converter/converterFunctions/extractTitles.ts
var extractTitles = (description) => {
  if (!description) return {};
  const titles = description.match(/^title [A-z0-9 ]+ \([^]*?\n\)$/gm);
  if (titles === null) return {};
  return titles.reduce((acc, titleText) => {
    const lines2 = titleText.split("\n");
    const titleName = lines2[0].replace(/title|\(.*/gi, "").trim();
    lines2.splice(0, 1);
    lines2.splice(-1, 1);
    acc[titleName] = lines2.join("\n");
    return acc;
  }, {});
};

// packages/export/src/converter/helpers.ts
var unsafeKeys = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var pick = (object, keys) => {
  const result = {};
  if (object == null) return result;
  const source = Object(object);
  for (const key of keys) {
    if (unsafeKeys.has(key) || !(key in source)) continue;
    result[key] = source[key];
  }
  return result;
};
var pullInPlace = (array, drop2) => {
  let write = 0;
  for (let read = 0; read < array.length; read++) {
    const value = array[read];
    if (!drop2(value)) array[write++] = value;
  }
  array.length = write;
  return array;
};
var isNullish = (value) => value === void 0 || value === null;
var isNullishOrNaN = (value) => isNullish(value) || Number.isNaN(value);
var isEmptyObject = (value) => {
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  for (const key in value) if (Object.prototype.hasOwnProperty.call(value, key)) return false;
  return true;
};
function cleanObject(dirtyObject, allowMutations = false) {
  const obj = allowMutations ? dirtyObject : structuredClone(dirtyObject);
  const remover = (obj2) => {
    for (const key in obj2) {
      if (Array.isArray(obj2[key])) {
        obj2[key] = pullInPlace(obj2[key], isNullishOrNaN);
      }
      if (isNullish(obj2[key])) delete obj2[key];
      if (Number.isNaN(obj2[key])) delete obj2[key];
      if (!obj2[key] || typeof obj2[key] !== "object") continue;
      remover(obj2[key]);
      if (isEmptyObject(obj2[key])) delete obj2[key];
    }
    if (Array.isArray(obj2)) return pullInPlace(obj2, (value) => value === void 0);
    return obj2;
  };
  return remover(obj);
}
function customJsonStringify(object, properties, spaces = 1) {
  const string = JSON.stringify(object, void 0, spaces);
  const regex = new RegExp(`"(${properties.join("|")})"\\s*:\\s*\\[([^]+?)\\]`, "g");
  const matches = string.match(regex);
  if (matches === null) return string;
  const newString = matches.reduce((acc, match) => {
    acc = acc.replace(match, match.replaceAll("\n", "").replace(/  +/g, " "));
    return acc;
  }, string);
  return newString;
}

// packages/export/src/converter/converterFunctions/getDataFromPerk.ts
var getDataFromPerk = (perk, filters) => {
  const getFromPerk = ["hash", "name", "itemHash", "itemName", "editor"];
  Object.entries(filters).forEach(([filterName, value]) => {
    if (value && typeof value === "boolean") {
      getFromPerk.push(filterName);
    }
  });
  const newPerk = pick(perk, getFromPerk);
  const filteredDescriptionLanguages = pick(newPerk.editor, filters.languages || []);
  const filteredUpdateTrackerLanguages = pick(newPerk.updateTracker?.descriptions, filters.languages || []);
  const updateTracker = {
    descriptions: filteredUpdateTrackerLanguages,
    stats: filters.stats ? newPerk.updateTracker?.stats : void 0
  };
  return {
    ...newPerk,
    editor: filteredDescriptionLanguages,
    updateTracker: filters.updateTracker ? updateTracker : void 0
  };
};

// packages/export/src/converter/converterFunctions/loadVariables.ts
var getVariables = (description) => {
  const variables = description.match(/^var [a-zA-Z0-9]+ = .+$/gm);
  if (variables === null) return;
  return variables.reduce((acc, variableText) => {
    const varName = variableText.match(/(?<=var )[a-zA-Z0-9]+(?= = )/)?.[0].trim();
    const varValue = variableText.match(/(?<=var [a-zA-Z0-9]+ = ).+/)?.[0].trim();
    if (!varName || !varValue) return acc;
    if (varValue === "empty") {
      acc[varName] = "";
      return acc;
    }
    acc[varName] = varValue;
    return acc;
  }, {});
};
var loadVariables = (descriptionData) => {
  const { language, descriptionString, database } = descriptionData;
  let description = descriptionString;
  const getVariablesNames = (description2) => {
    return description2.match(/#[a-zA-Z0-9]+/g) || [];
  };
  const replaceVariables = (variablesInDescription) => {
    variablesInDescription.forEach((variableName) => {
      const cleanVariableName = variableName.replace("#", "");
      const variables = {
        ...getVariables(description),
        ...getVariables(database[2].editor[language]?.main || ""),
        ...getVariables(database[2].editor[language]?.secondary || "")
      };
      if (variables[cleanVariableName] === void 0) return;
      description = description.replaceAll(variableName, variables[cleanVariableName]);
    });
  };
  replaceVariables(getVariablesNames(description));
  return description;
};

// packages/export/src/converter/weaponTypeNames.ts
var weaponTypeNames = [
  "Auto Rifle",
  "Combat Bow",
  "Fusion Rifle",
  "Glaive",
  "Grenade Launcher",
  "Hand Cannon",
  "Linear Fusion Rifle",
  "Machine Gun",
  "Pulse Rifle",
  "Rocket Launcher",
  "Scout Rifle",
  "Shotgun",
  "Sidearm",
  "Sniper Rifle",
  "Submachine Gun",
  "Sword",
  "Trace Rifle"
];
var weaponTypeExtraTags = ["Grenade", "Melee", "Super", "Heavy Grenade Launcher"];
var allWeaponTypeNames = [...weaponTypeNames, ...weaponTypeExtraTags];
var legacyWeaponTypeNames = {
  ar: "Auto Rifle",
  bow: "Combat Bow",
  fusion: "Fusion Rifle",
  gl: "Grenade Launcher",
  hc: "Hand Cannon",
  "heavy gl": "Heavy Grenade Launcher",
  lfr: "Linear Fusion Rifle",
  lmg: "Machine Gun",
  pulse: "Pulse Rifle",
  rocket: "Rocket Launcher",
  scout: "Scout Rifle",
  smg: "Submachine Gun",
  sniper: "Sniper Rifle",
  trace: "Trace Rifle"
};
var canonicalByLowercase = new Map(allWeaponTypeNames.map((name) => [name.toLowerCase(), name]));
var canonicalWeaponType = (name, legacy = false) => {
  const key = name.trim().replace(/\s+/g, " ").toLowerCase();
  return canonicalByLowercase.get(key) ?? (legacy ? legacyWeaponTypeNames[key] : void 0);
};
var legacyNames = weaponTypes.map((legacyName) => ({ legacyName, name: canonicalWeaponType(legacyName, true) }));

// packages/core/src/markup/arithmetic.ts
function evaluateMarkupMath(text) {
  return text.replace(/\${.+?}/g, (expression) => {
    const source = expression.match(
      /(-?\d+(\.\d+)?)(\s{0,9}[+\-/*]\s{0,9}(-?\d+(\.\d+)?)){0,99}/
    )?.[0];
    if (!source) return expression;
    const tokens = source.match(/-?\d+(?:\.\d+)?|[+*/-]/g) ?? [];
    let index = 0;
    function number() {
      return Number(tokens[index++]);
    }
    function product() {
      let value2 = number();
      while (tokens[index] === "*" || tokens[index] === "/") {
        const operator = tokens[index++];
        const right = number();
        value2 = operator === "*" ? value2 * right : value2 / right;
      }
      return value2;
    }
    let value = product();
    while (index < tokens.length) {
      const operator = tokens[index];
      if (operator.startsWith("-") && operator.length > 1) value += product();
      else {
        index++;
        const right = product();
        value = operator === "+" ? value + right : value - right;
      }
    }
    if (!Number.isFinite(value)) return String(value);
    const [coefficient, exponent = "0"] = String(value).split("e");
    const shifted = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
    const [rounded, roundedExponent = "0"] = String(shifted).split("e");
    return String(Number(`${rounded}e${Number(roundedExponent) - 2}`));
  });
}

// packages/export/src/converter/converterFunctions/math.ts
var doMath = (description) => evaluateMarkupMath(description);

// packages/export/src/converter/converterFunctions/loadExports.ts
var getExports = (description) => {
  const exported = description.match(/^export [A-z0-9 ]+ \([\s\S]*?\n\)$/gm);
  if (exported === null) return /* @__PURE__ */ new Map();
  return exported.reduce((acc, exportText) => {
    const lines2 = exportText.split("\n");
    const exportName = lines2[0].replace(/export|hidden|\(.*/gi, "").trim();
    lines2.splice(0, 1);
    lines2.splice(-1, 1);
    acc.set(exportName, lines2.join("\n"));
    return acc;
  }, /* @__PURE__ */ new Map());
};
var loadExports = (descriptionData) => {
  const { descriptionString, editorType, language, hash, database } = descriptionData;
  let description = descriptionString;
  const getImports = (descriptionString2) => {
    if (!descriptionString2.includes("import")) return null;
    const imports = [
      ...descriptionString2.match(/^import [A-z0-9 ]+? from (\d+|global) *?$/gm) || [],
      ...descriptionString2.match(/^import self *?$/gm) || []
    ];
    return imports.flatMap((importLine) => {
      const importSelf = importLine.includes("import self");
      if (importSelf) {
        return {
          line: importLine,
          name: "self",
          from: ""
        };
      }
      const name = importLine.match(/(?<=import) .+ (?=from)/)?.[0].trim();
      const from = importLine.match(/(?<=from) (\d+|global)/)?.[0].trim();
      if (name === void 0 || from === void 0) return [];
      return {
        line: importLine,
        name: importLine.match(/(?<=import) .+ (?=from)/)?.[0].trim() || "",
        from: importLine.match(/(?<=from) (\d+|global)/)?.[0].trim() || ""
      };
    });
  };
  const replaceImports = (importsInDescription) => {
    importsInDescription.forEach(({ line, name, from }) => {
      const editorToImportFrom = editorType === "main" ? "secondary" : "main";
      if (name === "self") {
        const imported2 = database[hash]?.editor[language]?.[editorToImportFrom];
        if (imported2 === void 0) throw new Error(`Missing self import for ${hash}/${language}/${editorToImportFrom}`);
        description = description.replace(line, () => imported2.trim());
        return;
      }
      if (name === "main" || name === "secondary") {
        const imported2 = database[from]?.editor[language]?.[name];
        if (imported2 === void 0) throw new Error(`Missing import ${name} from ${from} for ${hash}/${language}`);
        description = description.replace(line, () => imported2);
        return;
      }
      if (from === "global") {
        const globalExports = new Map([
          ...getExports(database[1]?.editor[language]?.main || ""),
          ...getExports(database[1]?.editor[language]?.secondary || "")
        ]);
        const imported2 = globalExports.get(name);
        if (imported2 === void 0) throw new Error(`Missing global export ${name} for ${hash}/${language}`);
        description = description.replace(line, () => imported2);
        return;
      }
      const imported = getExports(database[from]?.editor[language]?.[editorToImportFrom] || "").get(name);
      if (imported === void 0) throw new Error(`Missing export ${name} from ${from} for ${hash}/${language}`);
      description = description.replace(line, () => imported);
    });
  };
  for (let i = 0; i < 5; i++) {
    const importsFound = getImports(description);
    if (importsFound === null) break;
    replaceImports(importsFound);
  }
  if (getImports(description)?.length) throw new Error(`Unresolved or cyclic imports for ${hash}/${language} after 5 passes`);
  return description;
};

// packages/export/src/converter/converterFunctions/removePerkSpecificText.ts
var removePerkSpecificText = (description, perkType) => {
  const enhancedExports = description.match(/^enhanced \([\s\S]*?\n\)$/gm);
  if (enhancedExports && perkType !== "Weapon Trait Enhanced") {
    enhancedExports.forEach((enhancedExport) => {
      description = description.replace(enhancedExport, "");
    });
    description = description.replaceAll("#e", "");
  }
  const catalystExports = description.match(/^catalyst \([\s\S]*?\n\)$/gm);
  if (catalystExports && perkType !== "Weapon Catalyst Exotic") {
    catalystExports.forEach((catalystExport) => {
      description = description.replace(catalystExport, "");
    });
  }
  const exoticPerkExports = description.match(/^exotic perk \([\s\S]*?\n\)$/gm);
  if (exoticPerkExports && perkType !== "Weapon Perk Exotic") {
    exoticPerkExports.forEach((exoticPerkExport) => {
      description = description.replace(exoticPerkExport, "");
    });
  }
  return description;
};

// packages/export/src/converter/converterFunctions/removeUnusedText.ts
var removeUnusedText = (description, removeTitle = true) => {
  description = description.replace(/\r/g, "");
  description = description.replace(/\/\*[^]*\*\/\n?/g, "");
  description = description.replace(/^ *?\/\/.*$\n?| +\/\/.*$/gm, "");
  description = description.replace(/^export hidden .* \([^]*?\n\)$/gm, "");
  description = description.replace(/^export .* \( *$\n/gm, "");
  description = description.replace(/^enhanced \($\n/gm, "");
  if (removeTitle) {
    description = description.replace(/\n?^title .+ \([^]*?\n\)$/gm, "");
    description = description.replace(/\n^\) *$/gm, "");
  }
  description = description.replace(/^var .* = .+$\n?/gm, "");
  description = description.replace(/\n\n\n+/gm, "\n\n");
  return description.trim();
};

// packages/export/src/converter/converterFunctions/extractClassesFromLine.ts
var getLineClasses = (line, classNamesArray) => {
  const classNames = classNamesArray.flatMap((className) => {
    const updatedClassName = `<${className}/>`;
    if (line.match(new RegExp(updatedClassName)) === null) return [];
    return className;
  });
  const cleanLine = classNames.reduce((acc, className) => {
    acc = acc.replace(new RegExp(`<${className}/>`), "");
    return acc;
  }, line);
  return {
    classNames,
    cleanLine
  };
};

// packages/export/src/converter/converterFunctions/lineConverter.ts
var convertLinesContent = (line, tiles) => {
  const splittedLine = line.split(/(<.+?\/>|🡅)/g).filter((line2) => line2 !== "");
  return splittedLine.reduce((acc, text) => {
    if (text === "\u{1F845}") {
      acc.push({
        text: "\u{1F845}",
        classNames: ["enhancedArrow"]
      });
      return acc;
    }
    const wrappersName = text.match(/<\w+/)?.[0].replace("<", "");
    if (wrappersName === void 0) {
      acc.push({
        text
      });
      return acc;
    }
    const { empty: empty2, withText } = classNameList;
    if (withText.includes(wrappersName)) {
      acc.push({
        text: text.replace(new RegExp(`<${wrappersName} | />`, "g"), ""),
        classNames: [wrappersName]
      });
      return acc;
    }
    if (empty2.includes(wrappersName)) {
      acc.push({
        classNames: [wrappersName]
      });
      return acc;
    }
    const wrapperContent = text.match(/\[.+\]/)?.[0].replace(/\[|\]/g, "");
    const wrapperText = text.replace(/ \[.+\] \/>/g, "");
    if (!wrapperContent || !wrapperText) return acc;
    if (wrappersName === "link") {
      acc.push({
        text: wrapperText.replace("<link ", ""),
        link: wrapperContent,
        classNames: ["link"]
      });
      return acc;
    }
    if (wrappersName === "formula") {
      acc.push({
        text: wrapperText.replace(/<formula ?/, ""),
        formula: wrapperContent,
        classNames: ["formula"]
      });
      return acc;
    }
    if (wrappersName === "title") {
      acc.push({
        text: wrapperText.replace("<title ", ""),
        title: tiles[wrapperContent],
        classNames: ["title"]
      });
      return acc;
    }
    return acc;
  }, []);
};

// packages/export/src/converter/converterFunctions/splitTable.ts
var splitTable = (line, title) => {
  const { classNames, cleanLine } = getLineClasses(line, classNameList.empty);
  const splittedLine = cleanLine.match(/\|.*?((?=\|)|$)/g) || [];
  return {
    classNames,
    rowContent: splittedLine.map((tableCell) => {
      const cellSpan = tableCell.match(/\|([bchr\d-]+)?/)?.[0]?.match(/-\d|\d/g);
      const colSpan = cellSpan?.filter((number) => Number(number) > 0)[0];
      const rowSpan = cellSpan?.filter((number) => Number(number) < 0)[0];
      const inCellClasses = {
        b: "bold",
        c: "center",
        h: "background",
        r: "right"
      };
      const cellClassNames = tableCell.match(/\|[bchr\d-]+/)?.[0].split("").filter((char) => inCellClasses[char] !== void 0).map((c) => inCellClasses[c]);
      tableCell = tableCell.replace(/\|[bchr\d-]+|\|/, "").trim();
      const convertCellContent = convertLinesContent(tableCell, title);
      const cleanedCell = convertCellContent.flatMap((span2) => {
        if ((span2.text === void 0 || span2.text.trim() === "") && (span2.classNames === void 0 || !span2.classNames?.some((className) => typeof className === "string")))
          return [];
        return {
          text: span2.text,
          classNames: span2.classNames,
          formula: span2.formula,
          title: span2.title
        };
      });
      return {
        colSpan: colSpan ? Number(colSpan) : void 0,
        rowSpan: rowSpan ? Number(rowSpan) * -1 : void 0,
        classNames: cellClassNames,
        cellContent: cleanedCell
      };
    })
  };
};

// packages/export/src/converter/converterFunctions/separateTableWeaponType.ts
var legacyNames2 = {
  ar: "Auto Rifle",
  bow: "Combat Bow",
  fusion: "Fusion Rifle",
  gl: "Grenade Launcher",
  hc: "Hand Cannon",
  "heavy gl": "Heavy Grenade Launcher",
  lfr: "Linear Fusion Rifle",
  lmg: "Machine Gun",
  pulse: "Pulse Rifle",
  rocket: "Rocket Launcher",
  scout: "Scout Rifle",
  smg: "Submachine Gun",
  sniper: "Sniper Rifle",
  trace: "Trace Rifle"
};
var separateTableWeaponType = (description, titles) => {
  const ordinary = description.replace(/\r/g, "").split("\n").map((line) => {
    const header = line.match(/^\s*<weapons(?:\s+(.*?))?\s*>\s*$/i) ?? line.match(/^\s*<\s*(?:weapon type\s*)?\((.*?)\)\s*>\s*$/);
    if (header) {
      const label = (header[1] || "Weapons").split(",").map((name) => {
        const clean = name.trim();
        const key = clean.toLowerCase();
        return key === "other" ? "Other weapons" : Object.hasOwn(legacyNames2, key) ? legacyNames2[key] : clean;
      }).join(", ");
      return `<bold ${label} />`;
    }
    if (/^\s*(<\/weapons\s*>|<\$\$>)\s*$/i.test(line)) return "";
    return line;
  }).join("\n");
  return separateBlocks(ordinary, titles);
};
var separateBlocks = (description, titles) => {
  const splittedDescription = description.match(/(< table [^]+?\n<\$>\n?|< weapon type [^]+?\n<\$\$>\n?)|(.+\n?|\n)/g)?.map((l) => l.trimEnd());
  if (!splittedDescription) return;
  return splittedDescription.reduce((acc, description2) => {
    if (description2.startsWith("< table ")) {
      const tableLines = description2.split("\n");
      if (tableLines.length < 3) return acc;
      tableLines.splice(-1);
      const firstLine = tableLines.splice(0, 1);
      const tableClasses = classNameList.table;
      const tableClassNames = firstLine[0].replace(/< table | >/g, "").match(/(\w+)/g)?.filter((string) => tableClasses.includes(string));
      acc.push({
        table: tableLines.flatMap((line) => splitTable(line, titles)),
        classNames: [...tableClassNames || [], "table"],
        isFormula: tableClassNames?.includes("formula")
      });
      return acc;
    }
    if (description2.trim() === "") {
      acc.push({
        classNames: ["spacer"]
      });
      return acc;
    }
    const { classNames, cleanLine } = getLineClasses(description2, classNameList.line);
    const breakSpaces = description2.includes("<breakSpaces/>");
    acc.push({
      classNames,
      linesContent: convertLinesContent(breakSpaces ? cleanLine.trimEnd() : cleanLine.trim(), titles)
    });
    return acc;
  }, []);
};

// packages/export/src/converter/descriptionConverter.ts
var prepareDescription = (descriptionData) => {
  const { language, hash, database } = descriptionData;
  let description = loadExports(descriptionData);
  description = removePerkSpecificText(description, database[hash].type);
  description = loadVariables({ ...descriptionData, descriptionString: description });
  description = doMath(description);
  return {
    preparedDescription: removeUnusedText(description.trim()),
    titles: {
      ...extractTitles(removeUnusedText(description, false)),
      ...extractTitles(database[3].editor[language]?.main),
      ...extractTitles(database[3].editor[language]?.secondary)
    }
  };
};
var descriptionConverter = (descriptionData) => {
  const { preparedDescription, titles } = prepareDescription(descriptionData);
  const convertedTitles = Object.entries(titles || {}).reduce(
    (acc, [titleName, titleContent]) => {
      const { preparedDescription: preparedDescription2 } = prepareDescription({ ...descriptionData, descriptionString: titleContent });
      const convertedTitles2 = separateTableWeaponType(preparedDescription2, {});
      if (convertedTitles2) acc[titleName] = convertedTitles2;
      return acc;
    },
    {}
  );
  return separateTableWeaponType(preparedDescription, convertedTitles);
};

// packages/export/src/converter/descriptionFilter.ts
var cleanDescription = (obj, converterType) => {
  const { getFromDescription, enhancedArrowReplacement } = getSettings(converterType);
  const remover = (obj2) => {
    for (const key in obj2) {
      if (key === "text") {
        if (enhancedArrowReplacement !== void 0 && obj2[key] === "\u{1F845}") {
          obj2[key] = enhancedArrowReplacement;
          continue;
        }
        if (obj2.classNames?.includes("pvp") && !getFromDescription.includeClassNames?.includes("pvp")) {
          const pvpText = obj2[key].match(/\[.+?\]/g)?.[0].replace(/\[|\]/g, "");
          if (pvpText === null) continue;
          obj2[key] = obj2[key].replace(pvpText, `PVP: ${pvpText}`);
          continue;
        }
      }
      if (key === "classNames") {
        obj2[key] = obj2[key]?.filter((className) => {
          return getFromDescription.includeClassNames?.includes(className);
        });
        continue;
      }
      if (!getFromDescription.link && key === "link") {
        delete obj2[key];
        continue;
      }
      if (!getFromDescription.title && key === "title") {
        delete obj2[key];
        continue;
      }
      if (!getFromDescription.table && key === "table") {
        delete obj2[key];
        continue;
      }
      if (obj2[key]?.hasOwnProperty("formula") || obj2[key]?.hasOwnProperty("isFormula")) {
        if (!getFromDescription.formula) {
          delete obj2[key];
          continue;
        }
      }
      if (!obj2[key] || typeof obj2[key] !== "object") continue;
      remover(obj2[key]);
    }
    return obj2;
  };
  return remover(obj);
};
var descriptionToString = (description, converterType) => {
  const options = getSettings(converterType).toStringConverterOptions;
  return description?.reduce((acc, line) => {
    if (line.classNames?.includes("spacer")) return acc = acc + "\n";
    const newLine = line.linesContent?.reduce((acc2, linesContent) => {
      if (linesContent.link && options?.link) {
        const [textStart, textEnd, linkStat, linkEnd] = options.link;
        acc2 = acc2 + `${textStart}${linesContent.text}${textEnd}${linkStat}${linesContent.link}${linkEnd}`;
        return acc2;
      }
      if (linesContent.classNames && linesContent.classNames?.length !== 0 && options?.classNames) {
        const newText = linesContent.classNames.reduce((acc3, className) => {
          if (className === void 0) return acc3;
          const [classNameStart, classNameEnd] = options.classNames?.[className] || ["", ""];
          acc3 = acc3 + `${classNameStart}${linesContent.text || ""}${classNameEnd}`;
          return acc3;
        }, "");
        acc2 = acc2 + newText;
        return acc2;
      }
      acc2 = acc2 + linesContent.text;
      return acc2;
    }, "");
    if (line.classNames && line.classNames?.length !== 0 && options?.classNames) {
      const lineWithClassNames = line.classNames.reduce((acc2, className) => {
        if (className === void 0) return acc2;
        const [classNameStart, classNameEnd] = options.classNames?.[className] || [
          "",
          ""
        ];
        acc2 = acc2 + `${classNameStart}${newLine}${classNameEnd}`;
        return acc2;
      }, "");
      acc = acc + "\n" + lineWithClassNames;
      return acc;
    }
    acc = acc + "\n" + newLine;
    return acc;
  }, "").trim();
};
var normalizeLegacySections = (lines2) => {
  if (!lines2) return lines2;
  let previousSection;
  return lines2.flatMap((line) => {
    const { weaponTypes: weaponTypes2, weaponBlock, weaponOther, ...body } = line;
    const label = weaponOther ? "Other" : weaponTypes2?.filter(Boolean).join(", ");
    const section = label ? `${weaponBlock ?? ""}:${label}` : void 0;
    const heading = section && section !== previousSection ? [{ linesContent: [{ text: `${label}:` }] }] : [];
    previousSection = section;
    body.linesContent?.forEach((content) => {
      content.title = normalizeLegacySections(content.title);
    });
    body.table?.forEach((row) => row.rowContent?.forEach((cell) => cell.cellContent?.forEach((content) => {
      content.title = normalizeLegacySections(content.title);
    })));
    return [...heading, body];
  });
};
var descriptionFilter = (description, converterType) => {
  const { toStringConverterOptions } = getSettings(converterType);
  const newDescription = cleanObject(cleanDescription(normalizeLegacySections(description), converterType));
  let removeSpacer = true;
  const finalDescription = newDescription?.reduceRight((acc, line) => {
    if (line.classNames?.includes("spacer") && removeSpacer) return acc;
    removeSpacer = false;
    acc.unshift(line);
    return acc;
  }, []);
  if (!toStringConverterOptions) return finalDescription;
  return descriptionToString(finalDescription, converterType);
};

// packages/export/src/converter/publisher.ts
var databaseConverter = (converterType, database, identical) => {
  const settings = getSettings(converterType);
  validateReferences(database);
  const lookup = expandAliases(database);
  const references = {};
  const newDatabase = {};
  for (const [hash, rawPerk] of Object.entries(database)) {
    const aliasOutput = isAliasStub(rawPerk) ? getAliasOutput(settings, rawPerk) : "copy";
    const perk = lookup[hash];
    if (aliasOutput === "skip" || perk === void 0) continue;
    if (Number(hash) < 50) continue;
    const editorDescription = perk.editor.en?.main.trim() || "";
    if (editorDescription === "") continue;
    if (!settings.optional && identical.has(hash)) continue;
    if (isAliasStub(rawPerk) && aliasOutput === "reference") {
      references[hash] = { hash: rawPerk.hash, aliasOf: rawPerk.aliasOf };
      continue;
    }
    const cleanPerk = getDataFromPerk(perk, settings.getFromPerk);
    const descriptions = Object.entries(cleanPerk.editor).reduce(
      (acc, [language, descriptions2]) => {
        const descriptionData = {
          database: lookup,
          descriptionString: descriptions2[settings.editor],
          editorType: settings.editor,
          hash: cleanPerk.hash,
          language
        };
        const convertedDescription = descriptionConverter(descriptionData);
        if (convertedDescription) {
          acc[language] = descriptionFilter(convertedDescription, converterType);
        }
        return acc;
      },
      {}
    );
    const { editor, ...withoutEditor } = cleanPerk;
    newDatabase[hash] = {
      ...withoutEditor,
      descriptions
    };
  }
  for (const [hash, reference] of Object.entries(references)) {
    if (newDatabase[reference.aliasOf] !== void 0) newDatabase[hash] = reference;
  }
  const output = cleanObject(newDatabase);
  validateOutputReferences(output);
  return output;
};

// packages/export/src/legacy.ts
var legacyPresets = [
  "clarity",
  "dim",
  "crayon",
  "foundry",
  "lightGG",
  "braytech",
  "vaultZero",
  "clarityV2"
];
var deployedLegacyPresets = legacyPresets.filter(
  (preset) => preset !== "clarityV2"
);
var legacyFileName = (preset) => `${preset}.json`;
var encoder = new TextEncoder();
var isLegacyPreset = (preset) => legacyPresets.includes(preset) && Object.hasOwn(converterSettings, preset);
function bungieIdentical(input, inventoryItem) {
  const lookup = expandAliases(input.perks);
  const hashes = [];
  for (const hash of Object.keys(input.perks)) {
    const perk = lookup[hash];
    if (perk === void 0) continue;
    const english = perk.editor.en?.main.trim() || "";
    if (english === inventoryItem[hash]?.displayProperties?.description) hashes.push(hash);
  }
  return hashes;
}
function buildLegacy(input, preset, options = {}) {
  if (!isLegacyPreset(preset)) throw new Error(`Unknown legacy preset: ${String(preset)}`);
  const identical = new Set([...options.identical ?? []].map(String));
  const output = databaseConverter(preset, input.perks, identical);
  const text = customJsonStringify(output, ["stat", "multiplier", "weaponTypes", "classNames"]);
  return encoder.encode(text);
}
function nextVersions(previous) {
  if (typeof previous?.descriptions !== "number" || !Number.isFinite(previous.descriptions)) {
    throw new Error('versions.json needs a numeric "descriptions" value');
  }
  const value = {
    ...previous,
    descriptions: Number((previous.descriptions * 1e4 + 1).toFixed(4)) / 1e4
  };
  return { value, bytes: encoder.encode(JSON.stringify(value, null, 1)) };
}
function buildAllLegacy(input, previousVersions, options = {}) {
  const versions = nextVersions(previousVersions);
  const identical = [...options.identical ?? []];
  const files = (options.presets ?? deployedLegacyPresets).map((preset) => {
    const name = legacyFileName(preset);
    try {
      return { preset, name, ok: true, bytes: buildLegacy(input, preset, { identical }) };
    } catch (error) {
      return {
        preset,
        name,
        ok: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  });
  return { files, versions: { name: "versions.json", ...versions } };
}

// packages/export/src/v1/vocabulary.ts
var configSchemaVersion = 1;
var supportedFormatVersions = [1];
var styles = ["structured", "markdown", "discord", "plain"];
var shapes = ["lines", "text"];
var exportLanguages = [
  "en",
  "de",
  "fr",
  "it",
  "pl",
  "ru",
  "es",
  "es-mx",
  "ko",
  "pt-br",
  "ja",
  "zh-cht",
  "zh-chs"
];
var itemKeys = [
  "name",
  "itemHash",
  "itemName",
  "type",
  "lastUpload",
  "uploadedBy",
  "updateTracker",
  "associated"
];
var iconSymbols = [
  "kinetic",
  "arc",
  "solar",
  "stasis",
  "void",
  "strand",
  "prismatic",
  "heavy",
  "primary",
  "special",
  "barrier",
  "overload",
  "unstoppable",
  "hunter",
  "titan",
  "warlock"
];
var symbolIds = [
  ...iconSymbols,
  "enhancedArrow",
  "bold",
  "yellow",
  "pve",
  "pvp",
  "elementText"
];
var configLimits = {
  files: 3,
  /** Active files plus retained entries (spec section 3, "Workload bounds"). */
  urlSlots: 6,
  retainedPerFile: 2,
  string: 64,
  categories: 64
};
var idPattern = /^[a-z][a-z0-9-]{1,31}$/;
var reservedIds = /* @__PURE__ */ new Set(["_build", "changelog", "index", "api", "assets", "well-known"]);
var isValidId = (id) => idPattern.test(id) && !reservedIds.has(id) && !/^v\d+$/.test(id);
var isLegacyFile = (file) => legacyPresets.includes(file.preset);

// packages/core/src/markup/syntax.ts
var markupColors = ["blue", "green", "purple", "yellow", "center", "bold", "pve", "pvp"];
var markupIcons = [
  "kinetic",
  "arc",
  "solar",
  "stasis",
  "void",
  "strand",
  "prismatic",
  "heavy",
  "primary",
  "special",
  "barrier",
  "overload",
  "unstoppable",
  "hunter",
  "titan",
  "warlock"
];
var markupEmpty = ["background", "breakSpaces", "bold"];
var markupLineClasses = [...markupColors, ...markupEmpty];
var markupRetiredColors = ["blue", "green", "purple"];
var markupRetiredLineStyles = ["center", "breakSpaces", "background"];
var markupRetired = [...markupRetiredColors, ...markupRetiredLineStyles];
var markupTableClasses = [
  "background_1",
  "background_2",
  "centerTable",
  "formula",
  "wide"
];
function extractVariables(text) {
  return Object.fromEntries(
    [...text.matchAll(/^var ([a-zA-Z0-9]+) = (.+)$/gm)].map((match) => [
      match[1],
      match[2].trim() === "empty" ? "" : match[2].trim()
    ])
  );
}
function extractBlocks(text, kind) {
  const pattern = kind === "title" ? /^title [A-z0-9 ]+ \([^]*?\n\)$/gm : /^export [A-z0-9 ]+ \([\s\S]*?\n\)$/gm;
  return Object.fromEntries(
    [...text.matchAll(pattern)].map(([block]) => {
      const lines2 = block.split("\n");
      const name = lines2[0].replace(kind === "title" ? /title|\(.*/gi : /export|hidden|\(.*/gi, "").trim();
      return [name, lines2.slice(1, -1).join("\n")];
    })
  );
}

// packages/core/src/markup/weaponHeadings.ts
var legacyNames3 = {
  ar: "Auto Rifle",
  bow: "Combat Bow",
  fusion: "Fusion Rifle",
  gl: "Grenade Launcher",
  hc: "Hand Cannon",
  "heavy gl": "Heavy Grenade Launcher",
  lfr: "Linear Fusion Rifle",
  lmg: "Machine Gun",
  pulse: "Pulse Rifle",
  rocket: "Rocket Launcher",
  scout: "Scout Rifle",
  smg: "Submachine Gun",
  sniper: "Sniper Rifle",
  trace: "Trace Rifle"
};
function weaponSectionHeadings(text) {
  return text.replace(/\r/g, "").split("\n").map((line) => {
    const header = line.match(/^\s*<weapons(?:\s+(.*?))?\s*>\s*$/i) ?? line.match(/^\s*<\s*(?:weapon type\s*)?\((.*?)\)\s*>\s*$/);
    if (header) {
      const label = (header[1] || "Weapons").split(",").map((name) => {
        const clean = name.trim();
        return clean.toLowerCase() === "other" ? "Other weapons" : Object.hasOwn(legacyNames3, clean.toLowerCase()) ? legacyNames3[clean.toLowerCase()] : clean;
      }).join(", ");
      return `<bold ${label} />`;
    }
    if (/^\s*(<\/weapons\s*>|<\$\$>)\s*$/i.test(line)) return "";
    return line;
  }).join("\n");
}

// packages/core/src/markup/lines.ts
var inlineToken = /<.+?\/>/;
function lineClasses(line, allowed, offsets) {
  const classNames = allowed.filter((name) => line.includes(`<${name}/>`));
  let cleanLine = line;
  for (const name of classNames) {
    const marker = `<${name}/>`;
    const index = cleanLine.indexOf(marker);
    if (index !== -1) {
      cleanLine = cleanLine.slice(0, index) + cleanLine.slice(index + marker.length);
      offsets?.splice(index, marker.length);
    }
  }
  return {
    classNames,
    cleanLine
  };
}
function markupStrayTags(text) {
  const stray = [];
  for (const line of weaponSectionHeadings(text).split("\n")) {
    if (line.startsWith("< table ") || line.startsWith("<$>")) continue;
    for (const segment of line.split(new RegExp(`(${inlineToken.source})`, "g"))) {
      const tags = segment.match(/<\w+/g) ?? [];
      const isToken = new RegExp(`^${inlineToken.source}$`).test(segment);
      if (tags.length > (isToken ? 1 : 0)) stray.push(tags[0]);
    }
  }
  return stray;
}
function spans(line, titles) {
  return line.split(new RegExp(`(${inlineToken.source}|\u{1F845})`, "g")).filter(Boolean).flatMap((text) => {
    if (text === "\u{1F845}") return [{ text, classNames: ["enhancedArrow"] }];
    const wrapper = text.match(/<\w+/)?.[0].slice(1);
    if (wrapper === void 0) return [{ text }];
    if ([...markupColors, "background", "bold"].includes(wrapper)) {
      return [
        { text: text.replace(new RegExp(`<${wrapper} | />`, "g"), ""), classNames: [wrapper] }
      ];
    }
    if ([...markupIcons, ...markupEmpty].includes(wrapper)) return [{ classNames: [wrapper] }];
    const target = text.match(/\[.+\]/)?.[0].replace(/\[|\]/g, "");
    const label = text.replace(/ \[.+\] \/>/g, "");
    if (!target || !label) return [];
    if (wrapper === "link")
      return [{ text: label.replace("<link ", ""), link: target, classNames: ["link"] }];
    if (wrapper === "title")
      return [
        { text: label.replace("<title ", ""), title: titles[target], classNames: ["title"] }
      ];
    return [];
  });
}
function tableRow(line, titles) {
  const { classNames, cleanLine } = lineClasses(line, markupEmpty);
  return {
    classNames,
    rowContent: (cleanLine.match(/\|.*?((?=\|)|$)/g) ?? []).map((cell) => {
      const span2 = cell.match(/\|([bchr\d-]+)?/)?.[0].match(/-\d|\d/g);
      const colSpan = span2?.filter((value) => Number(value) > 0)[0];
      const rowSpan = span2?.filter((value) => Number(value) < 0)[0];
      const classes = {
        b: "bold",
        c: "center",
        h: "background",
        r: "right"
      };
      return {
        colSpan: colSpan ? Number(colSpan) : void 0,
        rowSpan: rowSpan ? -Number(rowSpan) : void 0,
        classNames: cell.match(/\|[bchr\d-]+/)?.[0].split("").filter((char) => classes[char]).map((char) => classes[char]),
        cellContent: spans(cell.replace(/\|[bchr\d-]+|\|/, "").trim(), titles).flatMap((part) => {
          if (!part.text?.trim() && !part.classNames?.some((name) => typeof name === "string"))
            return [];
          return [{ text: part.text, classNames: part.classNames, title: part.title }];
        })
      };
    })
  };
}
function parseLines(text, titles) {
  const blocks = weaponSectionHeadings(text).match(/(< table [^]+?\n<\$>\n?)|(.+\n?|\n)/g) ?? [];
  return blocks.flatMap((block) => {
    block = block.trimEnd();
    if (block.startsWith("< table ")) {
      const rows = block.split("\n");
      if (rows.length < 3) return [];
      const names = rows[0].replace(/< table | >/g, "").match(/(\w+)/g)?.filter((name) => markupTableClasses.includes(name));
      return [
        {
          table: rows.slice(1, -1).map((row) => tableRow(row, titles)),
          classNames: [...names ?? [], "table"],
          isFormula: names?.includes("formula")
        }
      ];
    }
    if (!block.trim()) return [{ classNames: ["spacer"] }];
    const { classNames, cleanLine } = lineClasses(block, markupLineClasses);
    return [
      {
        classNames,
        linesContent: spans(
          block.includes("<breakSpaces/>") ? cleanLine.trimEnd() : cleanLine.trim(),
          titles
        )
      }
    ];
  });
}

// packages/core/src/markup/baseEnhanced.ts
var enhancedMarkupType = "Weapon Trait Enhanced";
var baseEnhancedMessage = "Use {{base}{enhanced}} with two nonempty inline arms on one line; pairs cannot nest.";
function scanBaseEnhanced(text, allowEmpty = false) {
  const pairs = [];
  const issues = [];
  let cursor = 0;
  while (cursor < text.length) {
    const from = text.indexOf("{{", cursor);
    if (from < 0) break;
    let pos = from + 2;
    const arm = () => {
      const begin = pos;
      while (pos < text.length && text[pos] !== "}" && !/[\r\n]/.test(text[pos])) {
        if (text.startsWith("{{", pos)) return null;
        if (text[pos] === "{") {
          if (text[pos - 1] !== "$") return null;
          const end2 = text.indexOf("}", pos);
          if (end2 < 0 || /[{}\r\n]/.test(text.slice(pos + 1, end2))) return null;
          pos = end2 + 1;
        } else pos++;
      }
      const value = text.slice(begin, pos);
      return allowEmpty || value.trim() ? value : null;
    };
    const base = arm();
    if (base !== null && text.slice(pos, pos + 2) === "}{") {
      pos += 2;
      const enhanced = arm();
      if (enhanced !== null && text.slice(pos, pos + 2) === "}}") {
        cursor = pos + 2;
        pairs.push({ from, to: cursor, base, enhanced });
        continue;
      }
    }
    const end = text.indexOf("\n", from);
    cursor = end < 0 ? text.length : end + 1;
    issues.push({ from, to: end < 0 ? text.length : end });
  }
  return { pairs, issues };
}

// packages/core/src/markup/prepare.ts
function markupVariableReferences(text) {
  return text.match(/#[a-zA-Z0-9]+/g) ?? [];
}
function markupImports(text) {
  return [
    ...text.match(/^import [A-z0-9 ]+? from (\d+|global) *?$/gm) ?? [],
    ...text.match(/^import self *?$/gm) ?? []
  ];
}
var markupConditions = [
  ["enhanced", enhancedMarkupType],
  ["catalyst", "Weapon Catalyst Exotic"],
  ["exotic perk", "Weapon Perk Exotic"]
];
function markupConditionMatches(text, keyword) {
  return [...text.matchAll(new RegExp(`^${keyword} \\([\\s\\S]*?\\n\\)$`, "gm"))];
}
var markupCommentPatterns = [/\/\*[^]*\*\/\n?/g, /^ *?\/\/.*$\n?| +\/\/.*$/gm];
function markupCommentContext(text) {
  let offsets = Array.from({ length: text.length }, (_, index) => index);
  const comments = [];
  for (const [index, pattern] of [/\r/g, ...markupCommentPatterns].entries()) {
    let remaining = "";
    let remainingOffsets = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      remaining += text.slice(last, match.index);
      remainingOffsets = remainingOffsets.concat(offsets.slice(last, match.index));
      if (index > 0) {
        comments.push({
          from: offsets[match.index],
          to: offsets[match.index + match[0].length - 1] + 1
        });
      }
      last = match.index + match[0].length;
    }
    remaining += text.slice(last);
    remainingOffsets = remainingOffsets.concat(offsets.slice(last));
    text = remaining;
    offsets = remainingOffsets;
  }
  return { text, offsets, comments };
}
function removeMarkupComments(text) {
  return text.replace(/\r/g, "").replace(markupCommentPatterns[0], "").replace(markupCommentPatterns[1], "");
}
var unusedMarkup = {
  hidden: /^export hidden .* \([^]*?\n\)$/gm,
  exportOpen: /^export .* \( *$\n/gm,
  enhancedOpen: /^enhanced \($\n/gm,
  titles: /\n?^title .+ \([^]*?\n\)$/gm,
  close: /\n^\) *$/gm,
  variables: /^var .* = .+$\n?/gm,
  blanks: /\n\n\n+/gm
};
function normalizeMarkupWhitespace(text) {
  return text.replace(unusedMarkup.blanks, "\n\n").trim();
}
function removeUnusedText2(text, removeTitles = true) {
  text = removeMarkupComments(text).replace(unusedMarkup.hidden, "").replace(unusedMarkup.exportOpen, "").replace(unusedMarkup.enhancedOpen, "");
  if (removeTitles) {
    text = text.replace(unusedMarkup.titles, "").replace(unusedMarkup.close, "");
  }
  return normalizeMarkupWhitespace(text.replace(unusedMarkup.variables, ""));
}
function resolveImports(text, globals, diagnostics) {
  for (let pass = 0; pass < 5; pass++) {
    const imports = markupImports(text);
    if (!imports.length) return text;
    for (const line of imports) {
      const visible = removeUnusedText2(text, false).includes(line.trim());
      if (line.includes("import self")) {
        if (visible)
          diagnostics.push({
            severity: "error",
            message: "import self requires the removed secondary editor."
          });
        text = text.replace(line, "");
        continue;
      }
      const name = line.match(/(?<=import) .+ (?=from)/)?.[0].trim() ?? "";
      const from = line.match(/(?<=from) (\d+|global)/)?.[0].trim() ?? "";
      const source = globals.imports?.[from] ?? (from === "global" ? globals.imports?.["1"] : void 0);
      const imported = name === "main" || name === "secondary" ? source : extractBlocks(source ?? "", "export")[name];
      if (imported === void 0 && visible) {
        diagnostics.push({
          severity: "error",
          message: `Unresolved import "${name}" from ${from}.`
        });
      }
      text = text.replace(line, () => imported ?? "");
    }
  }
  if (/^import /m.test(text)) {
    diagnostics.push({
      severity: "error",
      message: "Import expansion exceeded the converter limit of five passes (possible cycle)."
    });
  }
  return text;
}
var pairSource = (piece) => `{{${piece.base}}{${piece.enhanced}}}`;
var pieceLength = (piece) => typeof piece === "string" ? piece.length : pairSource(piece).length;
var nativeSource = (pieces) => pieces.map((piece) => typeof piece === "string" ? piece : pairSource(piece)).join("");
var nativeStructure = (pieces) => pieces.map((piece) => typeof piece === "string" ? piece : "\uFFFC".repeat(pieceLength(piece))).join("");
var renderNative = (pieces) => pieces.map((piece) => typeof piece === "string" ? piece : piece.rendered).join("");
function nativePieces(text) {
  if (!text.includes("{{")) return [text];
  const pieces = [];
  const visible = markupCommentContext(text);
  let at = 0;
  for (const pair of scanBaseEnhanced(visible.text, true).pairs) {
    const from = visible.offsets[pair.from], to = visible.offsets[pair.to - 1] + 1;
    pieces.push(text.slice(at, from), { base: pair.base, enhanced: pair.enhanced });
    at = to;
  }
  pieces.push(text.slice(at));
  return pieces;
}
function nativeSlice(pieces, from, to) {
  const output = [];
  let at = 0;
  for (const piece of pieces) {
    const end = at + pieceLength(piece);
    if (end > from && at < to) {
      if (typeof piece === "string")
        output.push(piece.slice(Math.max(0, from - at), Math.min(piece.length, to - at)));
      else {
        if (from > at || to < end)
          throw new Error("Structural cleanup crossed a native inline token");
        output.push(piece);
      }
    }
    at = end;
  }
  return output;
}
function nativeKeep(pieces, offsets) {
  const output = [];
  for (let index = 0; index < offsets.length; ) {
    const from = offsets[index++];
    let to = from + 1;
    while (index < offsets.length && offsets[index] === to) {
      index++;
      to++;
    }
    output.push(...nativeSlice(pieces, from, to));
  }
  return output;
}
function nativeRemove(pieces, pattern, keepPrefix = 0) {
  const output = [];
  const source = nativeStructure(pieces);
  let at = 0;
  for (const match of source.matchAll(pattern)) {
    output.push(...nativeSlice(pieces, at, match.index + keepPrefix));
    at = match.index + match[0].length;
  }
  output.push(...nativeSlice(pieces, at, source.length));
  return output;
}
function cleanNative(pieces, removeTitles = true) {
  pieces = nativeKeep(pieces, markupCommentContext(nativeStructure(pieces)).offsets);
  for (const pattern of [unusedMarkup.hidden, unusedMarkup.exportOpen, unusedMarkup.enhancedOpen])
    pieces = nativeRemove(pieces, pattern);
  if (removeTitles)
    for (const pattern of [unusedMarkup.titles, unusedMarkup.close])
      pieces = nativeRemove(pieces, pattern);
  pieces = nativeRemove(pieces, unusedMarkup.variables);
  pieces = nativeRemove(pieces, unusedMarkup.blanks, 2);
  const source = nativeStructure(pieces);
  return nativeSlice(pieces, source.length - source.trimStart().length, source.trimEnd().length);
}
function replaceNativeVariable(pieces, variable, value) {
  const output = [];
  const append = (piece) => {
    const last = output.length - 1;
    if (typeof piece === "string" && typeof output[last] === "string") output[last] += piece;
    else output.push(piece);
  };
  for (const piece of pieces) {
    if (typeof piece !== "string" || !piece.includes(variable)) {
      append(piece);
      continue;
    }
    if (!value.includes("{{")) {
      append(piece.replaceAll(variable, value));
      continue;
    }
    piece.split(variable).forEach((part, index) => {
      if (index) nativePieces(value).forEach(append);
      append(part);
    });
  }
  return output;
}
function prepareNativePieces(pieces, globals) {
  const references = pieces.flatMap(
    (piece) => typeof piece === "string" ? markupVariableReferences(piece) : []
  );
  for (const variable of references) {
    const variables2 = {
      ...extractVariables(nativeSource(pieces)),
      ...extractVariables(globals.variables)
    };
    globals.onVariable?.(variable.slice(1));
    const value = Object.hasOwn(variables2, variable.slice(1)) ? variables2[variable.slice(1)] : void 0;
    if (value !== void 0) pieces = replaceNativeVariable(pieces, variable, value);
  }
  const variables = {
    ...extractVariables(nativeSource(pieces)),
    ...extractVariables(globals.variables)
  };
  return pieces.map((piece) => {
    if (typeof piece === "string") return evaluateMarkupMath(piece);
    if (piece.rendered !== void 0) return piece;
    let arm = globals.type === enhancedMarkupType ? piece.enhanced : piece.base;
    for (const variable of markupVariableReferences(arm)) {
      globals.onVariable?.(variable.slice(1));
      const value = Object.hasOwn(variables, variable.slice(1)) ? variables[variable.slice(1)] : void 0;
      if (value !== void 0) arm = arm.replaceAll(variable, value);
    }
    return { ...piece, rendered: evaluateMarkupMath(arm) };
  });
}
function prepareNativeTitle(pieces, globals) {
  return renderNative(cleanNative(prepareNativePieces(pieces, globals)));
}
function prepareNativeDocument(text, globals) {
  const pieces = prepareNativePieces(nativePieces(text), globals);
  const titlePieces = cleanNative(pieces, false);
  const source = nativeStructure(titlePieces);
  const titles = /* @__PURE__ */ Object.create(null);
  const nativeTitles = /* @__PURE__ */ Object.create(null);
  const globalTitles = extractBlocks(globals.titles, "title");
  for (const match of source.matchAll(/^title [A-z0-9 ]+ \([^]*?\n\)$/gm)) {
    const firstLine = match[0].indexOf("\n");
    const name = match[0].slice(0, firstLine).replace(/title|\(.*/gi, "").trim();
    const body = nativeSlice(
      titlePieces,
      match.index + firstLine + 1,
      match.index + match[0].length - 2
    );
    titles[name] = renderNative(body);
    if (!Object.hasOwn(globalTitles, name) && body.some((piece) => typeof piece !== "string"))
      nativeTitles[name] = body;
  }
  return {
    text: renderNative(cleanNative(pieces)),
    titles: { ...titles, ...globalTitles },
    nativeTitles
  };
}
function prepareMarkup(text, globals, diagnostics, onCondition) {
  text = resolveImports(text, globals, diagnostics);
  const nativePairs = text.includes("{{") || globals.variables.includes("{{") || globals.titles.includes("{{");
  if (nativePairs) {
    for (const source of [text, globals.variables, globals.titles]) {
      if (source.includes("{{") && scanBaseEnhanced(removeMarkupComments(source)).issues.length) {
        diagnostics.push({ severity: "error", message: baseEnhancedMessage });
      }
    }
  }
  for (const [keyword, type] of markupConditions) {
    const matches = markupConditionMatches(text, keyword);
    for (const match of matches) onCondition?.(keyword, match[0]);
    if (matches.length && globals.type !== type) {
      for (const match of matches.reverse())
        text = text.slice(0, match.index) + text.slice(match.index + match[0].length);
      if (keyword === "enhanced") text = text.replaceAll("#e", "");
    }
  }
  let native;
  if (nativePairs) {
    native = prepareNativeDocument(text, globals);
    text = native.text;
  } else {
    for (const variable of markupVariableReferences(text)) {
      const variables = { ...extractVariables(text), ...extractVariables(globals.variables) };
      globals.onVariable?.(variable.slice(1));
      const value = variables[variable.slice(1)];
      if (value !== void 0) text = text.replaceAll(variable, value);
    }
    text = evaluateMarkupMath(text);
  }
  const cleanText = native ? text : removeUnusedText2(text.trim());
  for (const variable of new Set(markupVariableReferences(cleanText))) {
    diagnostics.push({ severity: "warning", message: `Unknown variable ${variable}.` });
  }
  return {
    text: cleanText,
    nativeTitles: native?.nativeTitles,
    titles: native?.titles ?? {
      ...extractBlocks(removeUnusedText2(text, false), "title"),
      ...extractBlocks(globals.titles, "title")
    }
  };
}

// packages/core/src/markup/parse.ts
function parseMarkup(text, globals = { variables: "", titles: "" }) {
  const diagnostics = [];
  const prepared = prepareMarkup(text, globals, diagnostics);
  const titleBodies = prepared.nativeTitles ? Object.entries(prepared.titles).map(
    ([name, content]) => prepared.nativeTitles[name] ? prepareNativeTitle(prepared.nativeTitles[name], globals) : prepareMarkup(content, globals, []).text
  ) : Object.values(prepared.titles).map((content) => prepareMarkup(content, globals, []).text);
  for (const tag of new Set([prepared.text, ...titleBodies].flatMap(markupStrayTags))) {
    diagnostics.push({
      severity: "warning",
      message: `Unclosed or unknown tag "${tag}": text after it is read as markup and may be dropped or recoloured. Write a complete "${tag} text />" tag, or remove the "<".`
    });
  }
  const titles = {};
  for (const [name, content] of Object.entries(prepared.titles)) {
    const native = prepared.nativeTitles?.[name];
    const body = native ? prepareNativeTitle(native, globals) : prepareMarkup(content, globals, diagnostics).text;
    if (native) {
      for (const variable of new Set(markupVariableReferences(body))) {
        diagnostics.push({ severity: "warning", message: `Unknown variable ${variable}.` });
      }
    }
    titles[name] = parseLines(body, {});
  }
  return { lines: parseLines(prepared.text, titles), diagnostics };
}

// packages/export/src/v1/transform.ts
var emptyNotes = () => ({
  unchosen: /* @__PURE__ */ new Set(),
  retired: /* @__PURE__ */ new Set(),
  tables: 0
});
var isSymbol = (name) => symbolIds.includes(name);
function ruleFor(name, format, notes) {
  if (!isSymbol(name)) {
    notes.retired.add(name);
    return void 0;
  }
  const rule = format.symbols[name];
  if (!rule) notes.unchosen.add(name);
  return rule;
}
var unique = (names) => [
  ...new Set((names ?? []).filter((name) => typeof name === "string"))
];
function span(input, context) {
  const { format, shape } = context;
  const text = input.text ?? "";
  const names = unique(input.classNames);
  if (names.includes("link") && input.link !== void 0) {
    const rule = format.links;
    if (rule.mode === "keep" && shape === "lines")
      return [{ text, link: input.link, classNames: ["link"] }];
    if (rule.mode === "replace") {
      const [before, after, linkBefore, linkAfter] = rule.pattern;
      return [{ text: `${before}${text}${after}${linkBefore}${input.link}${linkAfter}` }];
    }
    return [{ text }];
  }
  if (names.includes("title")) {
    const rule = format.titles;
    if (rule.mode === "keep" && shape === "lines" && input.title) {
      const title = lines(input.title, context);
      return [title.length ? { text, title, classNames: ["title"] } : { text }];
    }
    if (rule.mode === "inline" && input.title) {
      const [before, after, innerBefore, innerAfter] = rule.pattern;
      const body = lines(input.title, context).flatMap((line, index) => [
        ...index ? [{ text: " " }] : [],
        ...(line.linesContent ?? []).map(
          (part) => line.classNames ? { ...part, classNames: unique([...part.classNames ?? [], ...line.classNames]) } : part
        )
      ]);
      return [{ text: `${before}${text}${after}${innerBefore}` }, ...body, { text: innerAfter }];
    }
    return [{ text }];
  }
  let out = input.text === void 0 ? {} : { text };
  for (const name of names) {
    const rule = ruleFor(name, format, context.notes);
    if (rule?.mode === "keep" && shape === "lines") {
      out = { ...out, classNames: [...out.classNames ?? [], name] };
    } else if (rule?.mode === "replace") {
      const inner = name === "enhancedArrow" ? "" : out.text ?? "";
      out = { ...out, text: `${rule.before}${inner}${rule.after}` };
    } else if (name === "enhancedArrow") {
      out = { ...out };
      delete out.text;
    }
  }
  return out.text === void 0 && !out.classNames ? [] : [out];
}
function compact(spans2) {
  const output = [];
  for (const part of spans2) {
    const plain = Object.keys(part).length === 1 && part.text !== void 0;
    if (plain && part.text === "") continue;
    const last = output[output.length - 1];
    if (plain && last && Object.keys(last).length === 1 && last.text !== void 0) {
      last.text += part.text;
    } else output.push(plain ? { text: part.text } : part);
  }
  return output;
}
function lines(input, context) {
  const output = [];
  for (const line of input) {
    if (line.table) {
      context.notes.tables++;
      continue;
    }
    const names = unique(line.classNames);
    if (names.includes("spacer")) {
      if (context.format.spacer === "keep") output.push({ classNames: ["spacer"] });
      continue;
    }
    let content = (line.linesContent ?? []).flatMap((part) => span(part, context));
    const classNames = [];
    for (const name of names) {
      const rule = ruleFor(name, context.format, context.notes);
      if (rule?.mode === "keep" && context.shape === "lines") classNames.push(name);
      else if (rule?.mode === "replace")
        content = [{ text: rule.before }, ...content, { text: rule.after }];
    }
    content = compact(content);
    if (!content.length) continue;
    output.push(
      classNames.length ? { classNames, linesContent: content } : { linesContent: content }
    );
  }
  const isSpacer = (line) => line?.classNames?.[0] === "spacer" && !line.linesContent;
  while (isSpacer(output[0])) output.shift();
  while (isSpacer(output[output.length - 1])) output.pop();
  return output;
}
function renderText(input, separator = "\n") {
  return input.map((line) => (line.linesContent ?? []).map((part) => part.text ?? "").join("")).join(separator).trim();
}
function transform(input, format, shape, notes) {
  const output = lines(input, { format, shape, notes });
  return shape === "lines" ? output : renderText(output);
}

// packages/export/src/v1/compile.ts
var compileStages = [
  "resolve",
  "select-rows",
  "select-keys",
  "references",
  "transform",
  "encode",
  "serialise"
];
var encoder2 = new TextEncoder();
function hasRawPair(input) {
  return Object.values(input.perks).some(
    (perk) => !isAliasStub(perk) && Object.values(perk.editor).some(
      (text) => text?.main.includes("{{") || text?.secondary.includes("{{")
    )
  );
}
function compile(input, file, options) {
  if (isLegacyFile(file)) {
    if (hasRawPair(input))
      throw new Error("Base/enhanced markup needs the new converter; legacy presets refuse it");
    const bytes = buildLegacy(input, file.preset, { identical: options.identical });
    return {
      stages: compileStages,
      ran: ["resolve", "select-rows", "references", "serialise"],
      legacy: true,
      bytes,
      notices: []
    };
  }
  return compileStyle(input, file, options);
}
function globalsOf(lookup, language) {
  const imports = /* @__PURE__ */ Object.create(null);
  for (const [hash, perk] of Object.entries(lookup))
    imports[hash] = perk.editor[language]?.main ?? "";
  return { variables: imports[2] ?? "", titles: imports[3] ?? "", imports };
}
function compileStyle(input, file, options) {
  const { data, format, shape } = file;
  const notices = [];
  const ran = [];
  validateReferences(input.perks);
  const lookup = expandAliases(input.perks);
  const languages2 = exportLanguages.filter((language) => data.languages.includes(language));
  const globals = new Map(languages2.map((language) => [language, globalsOf(lookup, language)]));
  const resolved = /* @__PURE__ */ new Map();
  const resolve = (hash, perk) => {
    let rows = resolved.get(hash);
    if (rows) return rows;
    rows = {};
    for (const language of languages2) {
      const text = perk.editor[language]?.main;
      if (text === void 0) continue;
      const markupGlobals = { ...globals.get(language), type: perk.type };
      const { lines: lines2, diagnostics } = parseMarkup(text, markupGlobals);
      const error = diagnostics.find((diagnostic) => diagnostic.severity === "error");
      if (error) throw new Error(`Tooltip ${hash} (${language}): ${error.message}`);
      if (lines2.length) rows[language] = lines2;
    }
    resolved.set(hash, rows);
    return rows;
  };
  ran.push("resolve");
  const identical = new Set([...options.identical ?? []].map(String));
  const knownCategories = new Set(options.catalog.categories.map((category) => category.id));
  const categories = new Set(data.categories);
  const sandbox = new Set(data.sandboxPerks);
  const uncategorised = [];
  const selected = [];
  for (const [hash, raw] of Object.entries(input.perks)) {
    const perk = lookup[hash];
    if (perk === void 0 || Number(hash) < 50) continue;
    if ((perk.editor.en?.main.trim() ?? "") === "") continue;
    if (!data.bungieIdentical && identical.has(hash)) continue;
    const alias = isAliasStub(raw) ? raw : void 0;
    if (alias?.aliasKind === "frame" && !data.frameAliases) continue;
    const owner = alias?.aliasKind === "sandbox" ? String(alias.aliasOf) : hash;
    const category = options.catalog.items[owner]?.categoryId;
    if (category === void 0 || !knownCategories.has(category)) {
      uncategorised.push(Number(hash));
      continue;
    }
    if (!(alias?.aliasKind === "sandbox" ? sandbox : categories).has(category)) continue;
    const rows = resolve(hash, perk);
    if (!languages2.some((language) => rows[language])) continue;
    selected.push(hash);
  }
  if (uncategorised.length)
    notices.push({ kind: "uncategorised", hashes: uncategorised.sort((a, b) => a - b) });
  ran.push("select-rows");
  const keys = itemKeys.filter((key) => data.keys.includes(key));
  const picked = /* @__PURE__ */ new Map();
  for (const hash of selected) {
    const perk = lookup[hash];
    const item = {};
    for (const key of keys) {
      if (key === "updateTracker") {
        const tracker = perk.updateTracker?.descriptions ?? {};
        const descriptions = Object.fromEntries(
          languages2.flatMap(
            (language) => tracker[language] ? [[language, tracker[language]]] : []
          )
        );
        if (Object.keys(descriptions).length) item.updateTracker = { descriptions };
        continue;
      }
      const value = perk[key];
      if (value !== void 0 && value !== "") item[key] = value;
    }
    picked.set(hash, item);
  }
  ran.push("select-keys");
  const inFile = new Set(selected.map(Number));
  for (const item of picked.values()) {
    if (!Array.isArray(item.associated)) continue;
    const kept = item.associated.filter((target) => inFile.has(target));
    if (kept.length) item.associated = kept;
    else delete item.associated;
  }
  ran.push("references");
  const notes = emptyNotes();
  const expanded = {};
  for (const hash of selected) {
    const rows = resolved.get(hash);
    const descriptions = {};
    for (const language of languages2) {
      const lines2 = rows[language];
      if (lines2) descriptions[language] = transform(lines2, format, shape, notes);
    }
    expanded[hash] = { hash: Number(hash), ...picked.get(hash), descriptions };
  }
  if (notes.unchosen.size)
    notices.push({ kind: "unchosen-symbol", symbols: [...notes.unchosen].sort() });
  if (notes.retired.size)
    notices.push({ kind: "retired-markup", classNames: [...notes.retired].sort() });
  if (notes.tables) notices.push({ kind: "tables-dropped", count: notes.tables });
  ran.push("transform");
  const encoded = encodeV1(expanded);
  ran.push("encode");
  validateV1(encoded);
  const bytes = encoder2.encode(JSON.stringify(encoded));
  ran.push("serialise");
  return { stages: compileStages, ran, legacy: false, expanded, file: encoded, bytes, notices };
}
function encodeV1(expanded) {
  const texts = [];
  const index = /* @__PURE__ */ new Map();
  const items = {};
  for (const [hash, item] of Object.entries(expanded)) {
    const { descriptions, ...keys } = item;
    delete keys.hash;
    const key = JSON.stringify(descriptions);
    let t = index.get(key);
    if (t === void 0) {
      t = texts.push(descriptions) - 1;
      index.set(key, t);
    }
    items[hash] = { ...keys, t };
  }
  return { texts, items };
}
function validateV1(file) {
  for (const [hash, item] of Object.entries(file.items)) {
    if (!Number.isInteger(item.t) || item.t < 0 || item.t >= file.texts.length)
      throw new Error(`Item ${hash} points at missing text ${item.t}`);
    for (const target of item.associated ?? [])
      if (!Object.hasOwn(file.items, String(target)))
        throw new Error(`Item ${hash} is associated with ${target}, which is not in the file`);
  }
}

// packages/export/src/v1/styles.ts
var keep = { mode: "keep" };
var drop = { mode: "drop" };
var replace = (before, after = "") => ({ mode: "replace", before, after });
var iconWords = {
  kinetic: "[Kinetic]",
  arc: "[Arc]",
  solar: "[Solar]",
  stasis: "[Stasis]",
  void: "[Void]",
  strand: "[Strand]",
  prismatic: "[Prismatic]",
  heavy: "[Heavy]",
  primary: "[Primary]",
  special: "[Special]",
  barrier: "[Barrier]",
  overload: "[Overload]",
  unstoppable: "[Unstoppable]",
  hunter: "[Hunter]",
  titan: "[Titan]",
  warlock: "[Warlock]"
};
var every = (rule) => Object.fromEntries(symbolIds.map((symbol) => [symbol, rule(symbol)]));
var markdownSymbols = (icons) => every((symbol) => {
  if (iconSymbols.includes(symbol))
    return icons === "words" ? replace(iconWords[symbol]) : drop;
  if (symbol === "bold") return replace("**", "**");
  if (symbol === "enhancedArrow") return replace("[enh]");
  return drop;
});
var styleShapes = {
  structured: "lines",
  markdown: "text",
  discord: "text",
  plain: "text"
};
var styleFormats = {
  structured: {
    symbols: every(() => keep),
    titles: { mode: "keep" },
    links: { mode: "keep" },
    elementTags: false,
    spacer: "keep"
  },
  markdown: {
    symbols: markdownSymbols("words"),
    titles: { mode: "drop" },
    links: { mode: "replace", pattern: ["[", "]", "(", ")"] },
    elementTags: false,
    spacer: "keep"
  },
  discord: {
    symbols: markdownSymbols("drop"),
    titles: { mode: "drop" },
    links: { mode: "replace", pattern: ["[", "]", "(", ")"] },
    elementTags: false,
    spacer: "keep"
  },
  plain: {
    symbols: every(() => drop),
    titles: { mode: "drop" },
    links: { mode: "drop" },
    elementTags: false,
    spacer: "keep"
  }
};
var defaultData = () => ({
  categories: [],
  sandboxPerks: [],
  frameAliases: true,
  languages: ["en"],
  keys: ["name"],
  bungieIdentical: false
});
function newStyleFile(id, style, data = defaultData(), shape = styleShapes[style]) {
  const format = structuredClone(styleFormats[style]);
  if (shape === "text") {
    for (const symbol of symbolIds)
      if (format.symbols[symbol]?.mode === "keep") format.symbols[symbol] = drop;
    if (format.titles.mode === "keep") format.titles = { mode: "drop" };
    if (format.links.mode === "keep") format.links = { mode: "drop" };
  }
  return { id, formatVersion: 1, preset: style, shape, data: structuredClone(data), format };
}

// packages/export/src/v1/project.ts
var filePath = (projectId, file) => `${projectId}/v${file.formatVersion}/${file.id}.json`;
function projectIndex(config, built, notices = []) {
  const files = [];
  for (const file of config.files) {
    const path = filePath(config.id, file);
    if (built[path])
      files.push({ id: file.id, formatVersion: file.formatVersion, path, ...built[path] });
  }
  for (const entry of config.retained ?? []) {
    if (built[entry.path])
      files.push({
        id: entry.snapshot.id,
        formatVersion: entry.formatVersion,
        path: entry.path,
        ...built[entry.path],
        until: entry.until
      });
  }
  return { project: config.id, name: config.name, files, notices: [...notices] };
}

// packages/export/decoder/decode-v1.mjs
function decodeV1(file) {
  const decoded = {};
  for (const [hash, item] of Object.entries(file.items)) {
    const { t, ...keys } = item;
    const descriptions = file.texts[t];
    if (descriptions === void 0) throw new Error(`Item ${hash} points at missing text ${t}`);
    decoded[hash] = { hash: Number(hash), ...keys, descriptions };
  }
  return decoded;
}

// packages/export/src/v1/markers.ts
var typeOf = (value) => value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
function markerSet(file, tokens = []) {
  const markers = /* @__PURE__ */ new Set();
  const used = /* @__PURE__ */ new Set();
  const wanted = [...new Set(tokens.filter((token) => token.length > 0))];
  const v1 = isV1(file);
  const visit = (value, path, parentKey) => {
    markers.add(`${path}:${typeOf(value)}`);
    if (typeof value === "string") {
      for (const token of wanted) if (!used.has(token) && value.includes(token)) used.add(token);
      if (parentKey === "classNames") markers.add(`class ${path}=${value}`);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, `${path}[]`, parentKey);
      return;
    }
    if (value && typeof value === "object") {
      const wildcard = isDataKeyed(path, v1);
      for (const [key, child] of Object.entries(value))
        visit(child, `${path}.${wildcard ? "*" : key}`, key);
    }
  };
  visit(file, "$", "");
  for (const token of used) markers.add(`token ${JSON.stringify(token)}`);
  return [...markers].sort();
}
var isV1 = (file) => !!file && typeof file === "object" && "texts" in file && "items" in file;
function isDataKeyed(path, v1) {
  if (v1) return path === "$.items" || path === "$.texts[]";
  return path === "$" || path === "$.*.descriptions";
}
function markerChange(baseline, current) {
  const before = new Set(baseline);
  const after = new Set(current);
  const added = current.filter((marker) => !before.has(marker));
  const removed = baseline.filter((marker) => !after.has(marker));
  return added.length || removed.length ? { added, removed } : void 0;
}
function outputTokens(file) {
  if (isLegacyFile(file)) {
    const settings = converterSettings[file.preset];
    const options = settings?.toStringConverterOptions;
    return [
      ...Object.values(options?.classNames ?? {}).flatMap((pair) => pair ?? []),
      ...options?.title ?? [],
      ...options?.link ?? [],
      ...settings?.enhancedArrowReplacement ? [settings.enhancedArrowReplacement] : []
    ];
  }
  const { symbols, titles, links } = file.format;
  return [
    ...Object.values(symbols).flatMap(
      (rule) => rule?.mode === "replace" ? [rule.before, rule.after] : []
    ),
    ...titles.mode === "inline" ? titles.pattern : [],
    ...links.mode === "replace" ? links.pattern : []
  ];
}
export {
  buildAllLegacy,
  buildLegacy,
  bungieIdentical,
  compile,
  compileStages,
  configLimits,
  configSchemaVersion,
  decodeV1,
  defaultData,
  deployedLegacyPresets,
  encodeV1,
  exportLanguages,
  filePath,
  iconSymbols,
  idPattern,
  isLegacyFile,
  isValidId,
  itemKeys,
  legacyFileName,
  legacyPresets,
  markerChange,
  markerSet,
  newStyleFile,
  nextVersions,
  outputTokens,
  projectIndex,
  shapes,
  styleFormats,
  styleShapes,
  styles,
  supportedFormatVersions,
  symbolIds,
  validateV1
};
