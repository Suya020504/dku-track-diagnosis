"""Render a caption-led walkthrough from actual CUA screen captures.
No student records, browser control, or external media service is used here.
"""
import json, shutil, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT.parents[2]/'public'/'videos'
OUTPUT=ROOT.parents[2]/'output'/'video-guide'
SCENES=[
 ('01-home',6,'내 수업으로 트랙을 확인하는 방법','처음부터 결과 확인까지, 실제 화면으로 따라가 보세요.\n진단은 결과를 확인하면 끝나요.'),
 ('02-guide',8,'먼저, 트랙제를 이해해요','과목이 모여 모듈이 되고, 모듈을 묶어 트랙을 이수해요.\n가이드 설명을 읽은 뒤 나에게 맞는 방법으로 시작하세요.'),
 ('03-entry',10,'나에게 맞는 시작 방법 고르기','정한 트랙을 선택하거나, 관심 설문으로 찾아보세요.\n이미 들은 수업이 있다면 이수 이력으로 비교할 수 있어요.'),
 ('04-courses',10,'들은 과목만 체크하세요','내 정보를 확인하고 이수한 과목을 입력하세요.\n이수 완료·수강 중·계획한 과목은 구분해서 표시해요.'),
 ('04b-compare',8,'들은 수업으로 트랙을 비교해요','지금 이력에서 추가 수업이 얼마나 남았는지 비교해요.\n확인할 트랙을 고르면 나의 진단 결과로 이어집니다.'),
 ('05-result',12,'결과를 확인하면 진단이 끝나요','트랙별 현황과 남은 수업을 확인하세요.\n아래 목록은 모듈 학점을 채우는 추천 조합이에요.'),
 ('06-alternatives',9,'다른 과목으로 바꿀 수 있는지 확인','대체 후보를 펼치면 다른 선택을 볼 수 있어요.\n필수 인정과 여러 과목의 동시 변경은 따로 확인하세요.'),
 ('07-tools',8,'필요한 도구만 따로 열어요','더 진행하지 않아도 진단은 완료된 상태예요.\n계획이 필요할 때만 추가 도구를 펼쳐 보세요.'),
 ('08-plan',10,'원할 때 학기 계획까지','목표 학기와 수강량에 맞춰 남은 과목을 배치해요.\n학교 시간표에서 실제 개설 여부를 확인하세요.'),
 ('09-finish',5,'이제 내 수업으로 확인해 보세요','입력은 이 브라우저에 저장돼요.\n트랙 신청과 이수 인정은 학교에서 별도로 확인해 주세요.'),
]

def run(args):
    p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','warning','-y',*args],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',errors='replace')
    if p.returncode: raise RuntimeError(p.stderr[-5000:])

def stamp(seconds):
    h=int(seconds//3600);m=int(seconds%3600//60);s=seconds%60
    return f'{h:02}:{m:02}:{s:06.3f}'

def main():
    (ROOT/'fonts').mkdir(exist_ok=True)
    shutil.copyfile('C:/Windows/Fonts/malgun.ttf',ROOT/'fonts/body.ttf')
    shutil.copyfile('C:/Windows/Fonts/malgunbd.ttf',ROOT/'fonts/bold.ttf')
    (ROOT/'segments').mkdir(exist_ok=True)
    (ROOT/'text').mkdir(exist_ok=True)
    PUBLIC.mkdir(parents=True,exist_ok=True); OUTPUT.mkdir(parents=True,exist_ok=True)
    clock=0; vtt=['WEBVTT','']; records=[]
    for i,(name,duration,title,caption) in enumerate(SCENES):
        candidates=list((ROOT/'captures').glob(name+'.*'))
        if len(candidates)!=1: raise RuntimeError(f'Missing or ambiguous screenshot: {name}')
        titleFile=f'text/{name}-title.txt'
        (ROOT/titleFile).write_text(title,encoding='utf-8',newline='\n')
        captionFiles=[]
        for lineIndex,line in enumerate(caption.splitlines()):
            textFile=f'text/{name}-caption-{lineIndex}.txt'
            (ROOT/textFile).write_text(line,encoding='utf-8',newline='\n')
            captionFiles.append(textFile)
        frames=duration*25
        filters=','.join([
          'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
          "zoompan=z='min(1+on*0.00006,1.014)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=25",
          'drawbox=x=0:y=0:w=iw:h=74:color=0x143548@0.97:t=fill',
          'drawbox=x=0:y=592:w=iw:h=128:color=0x143548@0.97:t=fill',
          f"drawtext=fontfile=fonts/bold.ttf:text='{['안내','설명','선택','입력','비교','결과','참고','도구','도구','마침'][i]}':fontcolor=0x8de6c2:fontsize=22:x=24:y=24",
          f'drawtext=fontfile=fonts/bold.ttf:textfile={titleFile}:expansion=none:fontcolor=white:fontsize=28:x=90:y=20',
          "drawtext=fontfile=fonts/body.ttf:text='가상 이력 시연':expansion=none:fontcolor=0xc5e5df:fontsize=17:x=1090:y=27",
          *[f'drawtext=fontfile=fonts/body.ttf:textfile={textFile}:expansion=none:fontcolor=white:fontsize=25:x=44:y={614+lineIndex*42}' for lineIndex,textFile in enumerate(captionFiles)],
          'drawbox=x=0:y=712:w=iw:h=8:color=0x87daba@0.45:t=fill',
          f"drawbox=x=0:y=712:w={int(1280*(i+1)/len(SCENES))}:h=8:color=0x64d3a9:t=fill",
          'fade=t=in:st=0:d=0.18',f'fade=t=out:st={duration-.18}:d=0.18',
          'format=yuv420p',
        ])
        run(['-loop','1','-framerate','25','-i',str(candidates[0]),'-vf',filters,'-frames:v',str(frames),'-an','-c:v','libx264','-preset','veryfast','-crf','21','-movflags','+faststart',f'segments/{name}.mp4'])
        vtt.extend([f'{stamp(clock)} --> {stamp(clock+duration)}',title,caption,''])
        records.append({'name':name,'start':clock,'duration':duration,'title':title,'caption':caption,'source':str(candidates[0])})
        clock+=duration
        print(f'Rendered {i+1}/{len(SCENES)}: {name}',flush=True)
    (ROOT/'concat.txt').write_text('\n'.join(f"file 'segments/{s[0]}.mp4'" for s in SCENES),encoding='utf-8')
    target=PUBLIC/'track-service-guide.mp4'
    run(['-f','concat','-safe','0','-i','concat.txt','-c','copy','-movflags','+faststart',str(target)])
    poster=PUBLIC/'track-service-guide-poster.jpg'
    run(['-ss','1.0','-i',str(target),'-frames:v','1','-q:v','2',str(poster)])
    (PUBLIC/'track-service-guide.ko.vtt').write_text('\n'.join(vtt),encoding='utf-8')
    (ROOT/'storyboard.json').write_text(json.dumps({'duration':clock,'method':'Actual interface captures with caption overlays and gentle camera motion; no voiceover.','scenes':records},ensure_ascii=False,indent=2),encoding='utf-8')
    shutil.copyfile(target,OUTPUT/'트랙서비스_사용방법.mp4')
    shutil.copyfile(poster,OUTPUT/'트랙서비스_사용방법_표지.jpg')
    print(json.dumps({'duration':clock,'bytes':target.stat().st_size,'video':str(target)},ensure_ascii=False),flush=True)

if __name__=='__main__': main()

