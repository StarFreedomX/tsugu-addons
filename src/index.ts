import {Context, Logger, Schema} from 'koishi'

export const name = 'tsugu-addons'

export const tsuguAddonsLogger = new Logger('tsugu-addons');

const songInfoUrl: string = 'https://bestdori.com/api/songs/all.7.json'
const bandIdUrl: string = 'https://bestdori.com/api/bands/all.1.json'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'));

  ctx.command('notes-search <notes:number>')
    .alias('物量查曲')
    .action(async ({session}, notes) => {
      if (!notes || notes <= 0) return session.text('.inValidNotes');
      else if (notes > 5000) return session.text('.tooLarge');
      let songInfoJson: JSON,bandIdJson: JSON;
      let answer: string[] = [];
      [songInfoJson, bandIdJson] = await initJson();
      //console.log(songInfoJson);
      //console.log(bandIdJson);
      const keysArray = Object.keys(songInfoJson);
      for (let i = 0;i < keysArray.length;i++) {
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
        if (diff != -1){
          const titles = songInfoJson[key]["musicTitle"];
          const bandNames = bandIdJson[songInfoJson[key]["bandId"] + '']["bandName"];
          //console.log(bandIdJson);
          answer.push(`\n#${key} - ${
            titles[0]??
            titles[3]??
            titles[2]??
            titles[1]??
            titles[4]
          } - ${
            bandNames[0]??
            bandNames[3]??
            bandNames[2]??
            bandNames[1]??
            bandNames[4]
          } - 难度 ${['easy','normal','hard','expert','special'][diff]}\n`)
        }
      }

      if (answer.length > 0) {
        return session.text('.found', {
          notes: notes,
          info: answer
        });
      }else{
        return session.text('.notFound', {
          notes: notes,
        })
      }
    })
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

