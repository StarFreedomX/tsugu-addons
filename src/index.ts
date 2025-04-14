import {Context, Logger, Schema} from 'koishi'
import * as XLSX from 'xlsx';

export const name = 'tsugu-addons'

export const tsuguAddonsLogger = new Logger('tsugu-addons');

const songInfoUrl: string = 'https://bestdori.com/api/songs/all.7.json'
const bandIdUrl: string = 'https://bestdori.com/api/bands/all.1.json'
const nicknamePath = `${__dirname}/../assets/nickname_song.xlsx`

export interface nicknameExcelElement {
  Id: number;
  Title: string;
  Nickname: string;
}

export interface Config {
  notesSearch: boolean,
  searchSongId: boolean,
}

export const Config: Schema<Config> = Schema.object({
  notesSearch: Schema.boolean().default(true).description('开启物量查曲功能'),
  searchSongId: Schema.boolean().default(true).description('开启查songId功能'),
})

export function apply(ctx: Context, cfg: Config) {
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'));
  if (cfg.notesSearch) {
    ctx.command('notes-search <notes:number>')
      .alias('物量查曲')
      .action(async ({session}, notes) => {
        if (!notes || notes <= 0) return session.text('.inValidNotes');
        else if (notes > 5000) return session.text('.tooLarge');
        let answer: string[] = [];
        let songInfoJson: JSON, bandIdJson: JSON;
        [songInfoJson, bandIdJson] = await initJson();
        //console.log(songInfoJson);
        //console.log(bandIdJson);
        const keysArray = Object.keys(songInfoJson);
        for (let i = 0; i < keysArray.length; i++) {
          const key = keysArray[i];
          const notesObject = songInfoJson?.[key]?.["notes"];
          //console.log(keysArray);
          //console.log(key)
          const notesKeys = Object.keys(notesObject);
          let diff = -1;
          for (const key2 in notesKeys) {
            if (notesObject[key2] == notes) {
              diff = Number(key2);
              break;
            }
          }
          if (diff != -1) {
            const titles = songInfoJson[key]["musicTitle"];
            const bandNames = bandIdJson[songInfoJson[key]["bandId"] + '']["bandName"];
            //console.log(bandIdJson);
            answer.push(`\n#${key} - ${
              titles[0] ??
              titles[3] ??
              titles[2] ??
              titles[1] ??
              titles[4]
            } - ${
              bandNames[0] ??
              bandNames[3] ??
              bandNames[2] ??
              bandNames[1] ??
              bandNames[4]
            } - 难度 ${['easy', 'normal', 'hard', 'expert', 'special'][diff]}\n`)
          }
        }

        if (answer.length > 0) {
          return session.text('.found', {
            notes: notes,
            info: answer
          });
        } else {
          return session.text('.notFound', {
            notes: notes,
          })
        }
      });
  }
  if (cfg.searchSongId) {
    ctx.command('songid <name:text>')
      .alias('查曲id')
      .action(async ({session}, name) => {
        const nicknameJson = readExcelFile(nicknamePath);
        let songInfoJson: JSON, bandIdJson: JSON;
        [songInfoJson, bandIdJson] = await initJson();
        let answer: string[] = [];
        for (let i = 1; i < nicknameJson.length; i++) {
          if (nicknameJson[i]?.["Nickname"]?.split(',')?.some(item => betterCompare(item, name)) ||
            songInfoJson[String(nicknameJson[i].Id)]?.["musicTitle"]?.some(item => betterCompare(item, name))
          ) {
            const key = nicknameJson[i].Id;
            const titles = songInfoJson[key]["musicTitle"];
            const bandNames = bandIdJson[songInfoJson[key]["bandId"] + '']["bandName"];
            answer.push(`\n#${key} - ${
              titles[0] ??
              titles[3] ??
              titles[2] ??
              titles[1] ??
              titles[4]
            } - ${
              bandNames[0] ??
              bandNames[3] ??
              bandNames[2] ??
              bandNames[1] ??
              bandNames[4]
            }\n`)
          }

        }

        if (!answer || answer.length == 0) {
          return session.text('.notFound');
        } else {
          return session.text('.answer', {
            number: answer.length,
            info: answer
          })
        }
      })
  }
}

/**
 * 读取Excel文件
 * @param filePath 文件目录
 */
function readExcelFile(filePath: string): nicknameExcelElement[] {
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    // 获取工作表的名字
    const sheetName = workbook.SheetNames[0];
    // 获取工作表
    const worksheet = workbook.Sheets[sheetName];
    // 将工作表转换为JSON并返回
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (err) {
    tsuguAddonsLogger.error('读取xlsx文件发生错误')
    tsuguAddonsLogger.error(err)
  }
}

/**
 * 初始化，获取对应json
 */
async function initJson(): Promise<[JSON, JSON]> {
  try {
    return Promise.all([fetchJson(songInfoUrl), fetchJson(bandIdUrl)]);
  } catch (e) {
    console.error(e);
    return [null, null];
  }
}

/**
 * 从特定url获取json，并返回json对象
 * @param url json文件的url
 */
async function fetchJson(url: string): Promise<JSON> {
  // 发起网络请求并等待响应
  const response = await fetch(url);
  // 检查响应状态
  if (!response.ok) {
    tsuguAddonsLogger.error(`HTTP error! Fetch ${url} Failed, status: ${response.status}`);
  }
  // 解析 JSON 数据并返回
  return response.json();
}

/**
 * 忽略全半角
 * @param str
 */
function betterDistinguish(str: string) {
  str += '';
  str = str.toLowerCase().replace(/\s+/g, '');
  const reflectMap: Map<string, string> = new Map([
    ['，', ','],
    ['：', ':'],
    ['？', '?'],
    ['《', '<'],
    ['》', '>'],
    ['‘', "'"],
    ['’', "'"],
    ['“', '"'],
    ['”', '"'],
    ['；', ';'],
    ['！', '!'],
    ['、', ','],
    ['。', '.'],
    ['（', '('],
    ['）', ')'],
    ['【', '['],
    ['】', ']'],
    ['―', ''],
    ['', ''],
    ['', ''],
  ]);

  reflectMap.forEach((value: string, key: string) => {
    //console.log(`key: ${key} ; value: ${value}`);
    const regex = new RegExp(`${key}`, 'g');
    //console.log(regex);
    str = str.replace(regex, value);
  })
  //console.log(str)
  return str;
}

function betterCompare(str1: string, str2: string): boolean {
  return betterDistinguish(str1) == betterDistinguish(str2);
}
