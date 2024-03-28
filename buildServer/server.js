"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
var sqlite3_1 = __importDefault(require("sqlite3"));
var sqlite_1 = require("sqlite");
var fs_1 = __importDefault(require("fs"));
var axios_1 = __importDefault(require("axios"));
var db = null;
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var schema;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createDBConnection()];
                case 1:
                    db = _a.sent();
                    schema = fs_1.default.readFileSync('./sql/schema.sql', 'utf8');
                    return [4 /*yield*/, db.exec(schema)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, updateDB()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, replaceHttp()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, computeStreaks()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, computeCounts()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, computeRankings()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, db.exec('VACUUM')];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, db.close()];
                case 9:
                    _a.sent();
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
init();
function createDBConnection() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, sqlite_1.open)({
                        filename: './public/opencfb.sqlite',
                        driver: sqlite3_1.default.Database,
                    })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateDB() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var response3, fbsConferences, i, conf, response4, fcsConferences, i, conf, division;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, axios_1.default.get('https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=80&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc')];
                case 1:
                    response3 = _c.sent();
                    fbsConferences = (_a = response3.data) === null || _a === void 0 ? void 0 : _a.children;
                    i = 0;
                    _c.label = 2;
                case 2:
                    if (!(i < fbsConferences.length)) return [3 /*break*/, 5];
                    conf = fbsConferences[i];
                    // console.log(conf);
                    return [4 /*yield*/, db.run("INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (?, ?, ?)", [conf.id, conf.name, 'fbs'])];
                case 3:
                    // console.log(conf);
                    _c.sent();
                    _c.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, axios_1.default.get('https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?region=us&lang=en&contentorigin=espn&group=81&level=3&sort=leaguewinpercent%3Adesc%2Cvsconf_wins%3Adesc%2Cvsconf_gamesbehind%3Aasc%2Cvsconf_playoffseed%3Aasc%2Cwins%3Adesc%2Closses%3Adesc%2Cplayoffseed%3Aasc%2Calpha%3Aasc')];
                case 6:
                    response4 = _c.sent();
                    fcsConferences = (_b = response4.data) === null || _b === void 0 ? void 0 : _b.children;
                    i = 0;
                    _c.label = 7;
                case 7:
                    if (!(i < fcsConferences.length)) return [3 /*break*/, 10];
                    conf = fcsConferences[i];
                    division = 'fcs';
                    return [4 /*yield*/, db.run("INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (?, ?, ?)", [conf.id, conf.name, division])];
                case 8:
                    _c.sent();
                    _c.label = 9;
                case 9:
                    i++;
                    return [3 /*break*/, 7];
                case 10: 
                // Add conference catch-alls for FBS/IA teams without espn records
                return [4 /*yield*/, db.run("INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483647, 'Unknown (probably former FBS but not eligible)', 'fcs')")];
                case 11:
                    // Add conference catch-alls for FBS/IA teams without espn records
                    _c.sent();
                    return [4 /*yield*/, db.run("INSERT OR REPLACE INTO conference(id, displayname, division) VALUES (2147483646, 'Unknown (FCS)', 'fcs')")];
                case 12:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function replaceHttp() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.exec("UPDATE team SET logo = replace(logo, 'http://', 'https://')")];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function computeRankings() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var db, ratingMap, lastWeekRating, initial, kFactor, gamesRated, data, eligibleTeams, teamSet, currYear, i, game, team1, team2, delta, team1Result, currRating1, currRating2, r1, r2, e1, e2, diff1, diff2, next, nextDate, nextYear, nextMonth, snapshot, i_1, row, lastDate, keys, i, key;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, createDBConnection()];
                case 1:
                    db = _b.sent();
                    ratingMap = {};
                    lastWeekRating = null;
                    initial = 1000;
                    kFactor = 32;
                    gamesRated = 0;
                    return [4 /*yield*/, db.all("SELECT game.id, game.date, gt.teamid as team1, gt2.teamid as team2, gt.result as team1result\n    FROM game\n    join gameteam gt on game.id = gt.gameid\n    join gameteam gt2 on gt2.gameid = gt.gameid and gt2.teamid != gt.teamid\n    join team t1 on gt.teamid = t1.id\n    join team t2 on gt2.teamid = t2.id\n    where gt.teamid < gt2.teamid\n    order by game.date asc")];
                case 2:
                    data = _b.sent();
                    return [4 /*yield*/, db.all("\n  SELECT team.id from team\n  JOIN conference ON team.conferenceid = conference.id\n  where conference.division = 'fbs'\n  ")];
                case 3:
                    eligibleTeams = _b.sent();
                    teamSet = new Set(__spreadArray([], eligibleTeams.map(function (row) { return row.id; }), true));
                    currYear = 0;
                    return [4 /*yield*/, db.run('BEGIN TRANSACTION')];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, db.run('DELETE FROM team_ranking_history')];
                case 5:
                    _b.sent();
                    i = 0;
                    _b.label = 6;
                case 6:
                    if (!(i < data.length)) return [3 /*break*/, 16];
                    game = data[i];
                    team1 = game.team1;
                    team2 = game.team2;
                    // Write the current team ratings into the gameteam table (pre-game rating)
                    return [4 /*yield*/, db.run("UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?", [ratingMap[team1], game.id, team1])];
                case 7:
                    // Write the current team ratings into the gameteam table (pre-game rating)
                    _b.sent();
                    return [4 /*yield*/, db.run("UPDATE gameteam SET rating = ? WHERE gameteam.gameid = ? and gameteam.teamid = ?", [ratingMap[team2], game.id, team2])];
                case 8:
                    _b.sent();
                    delta = 0;
                    if (teamSet.has(team1) && teamSet.has(team2)) {
                        gamesRated += 1;
                        team1Result = game.team1result;
                        if (!ratingMap[team1]) {
                            ratingMap[team1] = initial;
                        }
                        if (!ratingMap[team2]) {
                            ratingMap[team2] = initial;
                        }
                        currRating1 = ratingMap[team1];
                        currRating2 = ratingMap[team2];
                        r1 = Math.pow(10, currRating1 / 400);
                        r2 = Math.pow(10, currRating2 / 400);
                        e1 = r1 / (r1 + r2);
                        e2 = r2 / (r1 + r2);
                        diff1 = 0;
                        diff2 = 0;
                        if (team1Result === 'W') {
                            diff1 = kFactor * (1 - e1);
                            diff2 = kFactor * (0 - e2);
                        }
                        else if (team1Result === 'L') {
                            diff1 = kFactor * (0 - e1);
                            diff2 = kFactor * (1 - e2);
                        }
                        delta = Math.abs(diff1);
                        ratingMap[team1] += diff1;
                        ratingMap[team2] += diff2;
                    }
                    // Don't do anything for ties currently
                    // console.log(i, diff1, ratingMap[team1], ratingMap[team2]);
                    // Record the delta
                    return [4 /*yield*/, db.run('INSERT OR REPLACE INTO game_elo_delta (id, delta) VALUES (?, ?)', [game.id, delta])];
                case 9:
                    // Don't do anything for ties currently
                    // console.log(i, diff1, ratingMap[team1], ratingMap[team2]);
                    // Record the delta
                    _b.sent();
                    next = data[i + 1];
                    nextDate = new Date(next === null || next === void 0 ? void 0 : next.date);
                    nextYear = nextDate.getFullYear();
                    nextMonth = nextDate.getMonth();
                    if (!(!next || (nextYear > currYear && nextMonth >= 2))) return [3 /*break*/, 14];
                    console.log(currYear);
                    snapshot = Object.keys(ratingMap).map(function (teamId) {
                        return {
                            teamId: teamId,
                            rating: ratingMap[teamId],
                            year: currYear,
                            rank: 0,
                        };
                    });
                    snapshot.sort(function (a, b) { return b.rating - a.rating; });
                    // Add ranks
                    snapshot = snapshot.map(function (row, i) { return (__assign(__assign({}, row), { rank: i + 1 })); });
                    i_1 = 0;
                    _b.label = 10;
                case 10:
                    if (!(i_1 < snapshot.length)) return [3 /*break*/, 13];
                    row = snapshot[i_1];
                    // console.log(row);
                    return [4 /*yield*/, db.run("INSERT INTO team_ranking_history (id, year, rank, rating) VALUES (?, ?, ?, ?)", [row.teamId, row.year, row.rank, row.rating])];
                case 11:
                    // console.log(row);
                    _b.sent();
                    _b.label = 12;
                case 12:
                    i_1++;
                    return [3 /*break*/, 10];
                case 13:
                    currYear = nextYear;
                    _b.label = 14;
                case 14:
                    lastDate = Number(new Date((_a = data[data.length - 1]) === null || _a === void 0 ? void 0 : _a.date));
                    if (lastWeekRating == null && lastDate - Number(nextDate) < 7 * 24 * 60 * 60 * 1000) {
                        lastWeekRating = JSON.parse(JSON.stringify(ratingMap));
                    }
                    _b.label = 15;
                case 15:
                    i++;
                    return [3 /*break*/, 6];
                case 16: return [4 /*yield*/, db.run('DELETE FROM team_ranking')];
                case 17:
                    _b.sent();
                    keys = Object.keys(ratingMap);
                    i = 0;
                    _b.label = 18;
                case 18:
                    if (!(i < keys.length)) return [3 /*break*/, 21];
                    key = keys[i];
                    return [4 /*yield*/, db.run('INSERT INTO team_ranking(id, rating, prevRating) VALUES (?, ?, ?)', [
                            key,
                            ratingMap[key],
                            lastWeekRating === null || lastWeekRating === void 0 ? void 0 : lastWeekRating[key],
                        ])];
                case 19:
                    _b.sent();
                    _b.label = 20;
                case 20:
                    i++;
                    return [3 /*break*/, 18];
                case 21: return [4 /*yield*/, db.run('COMMIT')];
                case 22:
                    _b.sent();
                    console.log('%s games rated', gamesRated);
                    return [2 /*return*/];
            }
        });
    });
}
function computeCounts() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createDBConnection()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.run('BEGIN TRANSACTION')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, db.run('DROP TABLE team_count')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, db.run("CREATE TABLE team_count AS\n  select team.id,\n  count(1) gamesPlayed,\n  sum(case when gt.result = 'W' then 1 else 0 end) gamesWon,\n  sum(case when gt.result = 'L' then 1 else 0 end) gamesLost,\n  sum(case when gt.result = 'T' then 1 else 0 end) gamesTied\n  from team\n  join gameteam gt on team.id = gt.teamid \n  group by team.id")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, db.run('COMMIT')];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function computeStreaks() {
    return __awaiter(this, void 0, void 0, function () {
        var db, data, runningMap, currentStreakMap, allTimeStreakMap, keys, i, key;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createDBConnection()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.all("SELECT date, result, teamid from gameteam\n  join game on game.id = gameteam.gameid\n  order by date desc")];
                case 2:
                    data = _a.sent();
                    runningMap = {};
                    currentStreakMap = {};
                    allTimeStreakMap = {};
                    data.forEach(function (row) {
                        if (!runningMap[row.teamid]) {
                            runningMap[row.teamid] = 0;
                        }
                        if (row.result === 'W') {
                            runningMap[row.teamid] += 1;
                        }
                        else {
                            // Copy the data to current streak if we haven't done it already
                            // Limit to streaks starting in 2000 to remove some old invalid teams
                            if (!(row.teamid in currentStreakMap) &&
                                new Date(row.date).getFullYear() >= 2000) {
                                currentStreakMap[row.teamid] = runningMap[row.teamid];
                            }
                            // Copy the data to all time streak if it's better
                            if ((allTimeStreakMap[row.teamid] || 0) <= runningMap[row.teamid]) {
                                allTimeStreakMap[row.teamid] = runningMap[row.teamid];
                            }
                            runningMap[row.teamid] = 0;
                        }
                    });
                    // console.log(currentStreakMap, allTimeStreakMap);
                    // Write data to SQL
                    return [4 /*yield*/, db.run('BEGIN TRANSACTION')];
                case 3:
                    // console.log(currentStreakMap, allTimeStreakMap);
                    // Write data to SQL
                    _a.sent();
                    return [4 /*yield*/, db.run('DELETE FROM team_streak')];
                case 4:
                    _a.sent();
                    keys = Object.keys(currentStreakMap);
                    i = 0;
                    _a.label = 5;
                case 5:
                    if (!(i < keys.length)) return [3 /*break*/, 8];
                    key = keys[i];
                    return [4 /*yield*/, db.run('INSERT INTO team_streak (id, current, allTime) VALUES (?, ?, ?)', [key, currentStreakMap[key], allTimeStreakMap[key]])];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 5];
                case 8: return [4 /*yield*/, db.run('COMMIT')];
                case 9:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// TODO more features
// - circles of parity (longest cycle in directed graph problem)
// - margins of victory
// - dedicated rivalry pages
/*
function getMarginsOfVictory() {

}

function getCirclesOfParity() {

}
*/
